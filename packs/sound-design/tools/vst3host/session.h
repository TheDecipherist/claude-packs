// One plugin, loaded and running offline: no audio device, no window, no JUCE. A JUCE host cannot load every JUCE plugin (an allocator clash across
// the boundary aborted one inside its own parameter loader), and every audio path through an operating system can fail differently, one of them by
// returning silence instead of an error. A renderer that never opens a device has none of those failures, and runs faster than real time.
#pragma once

#include "host_events.h"
#include "options.h"

#include "pluginterfaces/vst/ivstaudioprocessor.h"
#include "pluginterfaces/vst/ivstcomponent.h"
#include "pluginterfaces/vst/ivsteditcontroller.h"
#include "pluginterfaces/vst/ivstprocesscontext.h"
#include "public.sdk/source/common/memorystream.h"
#include "public.sdk/source/vst/hosting/hostclasses.h"
#include "public.sdk/source/vst/hosting/module.h"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdio>
#include <deque>
#include <memory>
#include <string>
#include <vector>

namespace vst3host {

inline std::string titleOf (const Vst::ParameterInfo& info) {
    std::string name;
    for (int k = 0; k < 128 && info.title[k]; ++k) name += (char) info.title[k];
    return name;
}

class Session {
public:
    Session (const Options& options) : sampleRate (options.sampleRate), block (options.block) {}

    // Loads the module and wires the two halves. An empty return is success; anything else is why it failed.
    std::string open (const std::string& path) {
        std::string error;
        module = VST3::Hosting::Module::create (path, error);
        if (! module) return "load failed: " + error;
        auto factory = module->getFactory();
        for (auto& info : factory.classInfos()) {
            if (info.category() != kVstAudioEffectClass) continue;
            component = factory.createInstance<Vst::IComponent> (info.ID()).take();
            break;
        }
        if (! component) return "no audio class";
        host = new Vst::HostApplication();
        if (component->initialize (host) != kResultOk) return "initialize failed";
        component->queryInterface (Vst::IAudioProcessor::iid, (void**) &processor);
        if (! processor) return "no IAudioProcessor";
        openController (factory);
        return {};
    }

    void printParameters (bool withValues) {
        if (! controller) return void (std::printf ("  no controller, so no parameters to read\n"));
        const int32 count = controller->getParameterCount();
        std::printf ("  %d parameters\n", count);
        for (int32 i = 0; i < count; ++i) {
            Vst::ParameterInfo info {};
            if (controller->getParameterInfo (i, info) != kResultOk) continue;
            if (withValues) std::printf ("    %-40s %.6f\n", titleOf (info).c_str(), controller->getParamNormalized (info.id));
            else std::printf ("    %5d  id %-10u  %s\n", i, info.id, titleOf (info).c_str());
        }
    }

    // Every output bus is activated and given a buffer: a plugin handed fewer buses than it declares may write nothing at all.
    std::string start() {
        Vst::ProcessSetup setup {};
        setup.processMode = Vst::kOffline;
        setup.symbolicSampleSize = Vst::kSample32;
        setup.maxSamplesPerBlock = block;
        setup.sampleRate = sampleRate;
        if (processor->setupProcessing (setup) != kResultOk) return "setupProcessing failed";
        activateBuses();
        component->setActive (true);
        processor->setProcessing (true);
        prepareBuffers();
        return {};
    }

    void stop() {
        processor->setProcessing (false);
        component->setActive (false);
    }

    // Renders this long. Events and parameter changes go in the first block.
    void run (double seconds, bool keep) {
        const int64 total = (int64) (seconds * sampleRate);
        for (int64 done = 0; done < total; done += block) {
            const auto count = (int32) std::min<int64> (block, total - done);
            processBlock (count);
            if (! keep) continue;
            left.insert (left.end(), buffers[0].begin(), buffers[0].begin() + count);
            right.insert (right.end(), buffers[1].begin(), buffers[1].begin() + count);
        }
    }

    // Both routes. A firmware emulator's parameters may talk to it only through the controller, and a plain plugin reads inputParameterChanges.
    void setParam (Vst::ParamID id, double value) {
        if (controller) controller->setParamNormalized (id, value);
        int32 index = 0;
        int32 point = 0;
        if (auto* queue = changes.addParameterData (id, index)) queue->addPoint (0, value, point);
    }

    // VST3 has no event for sysex or a program change: raw MIDI goes in a data event, which a plugin's own MIDI parser reads.
    void sendBytes (std::vector<unsigned char> bytes) {
        kept.push_back (std::move (bytes));
        Vst::Event e {};
        e.type = Vst::Event::kDataEvent;
        e.data.type = Vst::DataEvent::kMidiSysEx;
        e.data.size = (uint32) kept.back().size();
        e.data.bytes = kept.back().data();
        events.addEvent (e);
    }

    void noteOn (int pitch, int velocity) {
        Vst::Event e {};
        e.type = Vst::Event::kNoteOnEvent;
        e.noteOn.pitch = (int16) pitch;
        e.noteOn.velocity = (float) velocity / 127.0f;
        e.noteOn.noteId = -1;
        events.addEvent (e);
    }

    void noteOff (int pitch) {
        Vst::Event e {};
        e.type = Vst::Event::kNoteOffEvent;
        e.noteOff.pitch = (int16) pitch;
        e.noteOff.noteId = -1;
        events.addEvent (e);
    }

    void clearKept() {
        left.clear();
        right.clear();
    }

    const std::vector<float>& keptLeft() const { return left; }
    const std::vector<float>& keptRight() const { return right; }
    Vst::IEditController* editController() { return controller; }
    ParamChanges& reported() { return outChanges; }

private:
    // State first, then the wire: the controller mirrors the component, so it needs the state before its parameters mean anything.
    void openController (VST3::Hosting::PluginFactory& factory) {
        if (component->queryInterface (Vst::IEditController::iid, (void**) &controller) != kResultOk) {
            TUID id;
            if (component->getControllerClassId (id) == kResultOk) controller = factory.createInstance<Vst::IEditController> (VST3::UID (id)).take();
            if (controller) controller->initialize (host);
        }
        if (! controller) return;
        wireHalves();
        MemoryStream state;
        if (component->getState (&state) != kResultOk) return;
        state.seek (0, IBStream::kIBSeekSet, nullptr);
        controller->setComponentState (&state);
    }

    void wireHalves() {
        Vst::IConnectionPoint* fromComponent = nullptr;
        Vst::IConnectionPoint* fromController = nullptr;
        component->queryInterface (Vst::IConnectionPoint::iid, (void**) &fromComponent);
        controller->queryInterface (Vst::IConnectionPoint::iid, (void**) &fromController);
        if (! fromComponent || ! fromController) return;
        fromComponent->connect (new ConnectionProxy (fromController));
        fromController->connect (new ConnectionProxy (fromComponent));
    }

    void activateBuses() {
        const int32 outputs = component->getBusCount (Vst::kAudio, Vst::kOutput);
        const int32 eventBuses = component->getBusCount (Vst::kEvent, Vst::kInput);
        std::printf ("  buses: %d audio out, %d event in\n", outputs, eventBuses);
        for (int32 bus = 0; bus < outputs; ++bus) component->activateBus (Vst::kAudio, Vst::kOutput, bus, true);
        for (int32 bus = 0; bus < eventBuses; ++bus) component->activateBus (Vst::kEvent, Vst::kInput, bus, true);
        if (component->getBusCount (Vst::kAudio, Vst::kInput) > 0) component->activateBus (Vst::kAudio, Vst::kInput, 0, true);
    }

    void prepareBuffers() {
        const auto outputs = (size_t) std::max (1, component->getBusCount (Vst::kAudio, Vst::kOutput));
        buffers.assign ((outputs + 1) * 2, std::vector<float> ((size_t) block, 0.0f)); // the last pair is the silent input
        pointers.resize (outputs + 1);
        busBuffers.assign (outputs + 1, Vst::AudioBusBuffers {});
        for (size_t bus = 0; bus <= outputs; ++bus) {
            pointers[bus] = { buffers[bus * 2].data(), buffers[bus * 2 + 1].data() };
            busBuffers[bus].numChannels = 2;
            busBuffers[bus].channelBuffers32 = pointers[bus].data();
        }
        context.state = Vst::ProcessContext::kPlaying | Vst::ProcessContext::kTempoValid;
        context.sampleRate = sampleRate;
        context.tempo = 120.0;
        data.processMode = Vst::kOffline;
        data.symbolicSampleSize = Vst::kSample32;
        data.numInputs = component->getBusCount (Vst::kAudio, Vst::kInput) > 0 ? 1 : 0;
        data.numOutputs = (int32) outputs;
        data.inputs = data.numInputs ? &busBuffers[outputs] : nullptr;
        data.outputs = busBuffers.data();
        data.inputEvents = &events;
        data.inputParameterChanges = &changes;
        data.outputParameterChanges = &outChanges; // left null, a change a plugin's own sysex handler made stays invisible
        data.processContext = &context;
    }

    void processBlock (int32 count) {
        data.numSamples = count;
        std::fill (buffers[0].begin(), buffers[0].end(), 0.0f);
        std::fill (buffers[1].begin(), buffers[1].end(), 0.0f);
        context.projectTimeSamples = position;
        processor->process (data);
        events.clear();
        changes.clear();
        kept.clear();
        position += count;
    }

    double sampleRate;
    int block;
    VST3::Hosting::Module::Ptr module;
    Vst::HostApplication* host = nullptr;
    Vst::IComponent* component = nullptr;
    Vst::IAudioProcessor* processor = nullptr;
    Vst::IEditController* controller = nullptr;
    std::vector<std::vector<float>> buffers;
    std::vector<std::array<float*, 2>> pointers;
    std::vector<Vst::AudioBusBuffers> busBuffers;
    Vst::ProcessContext context {};
    Vst::ProcessData data {};
    EventList events;
    ParamChanges changes;
    ParamChanges outChanges;
    std::deque<std::vector<unsigned char>> kept;
    std::vector<float> left;
    std::vector<float> right;
    int64 position = 0;
};

} // namespace vst3host
