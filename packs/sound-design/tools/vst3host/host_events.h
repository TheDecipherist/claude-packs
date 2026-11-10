// What a VST3 host must supply and the SDK inside JUCE leaves out: the parameter and event lists, and the wire between a plugin's two halves.
#pragma once

#include "pluginterfaces/vst/ivstevents.h"
#include "pluginterfaces/vst/ivstmessage.h"
#include "pluginterfaces/vst/ivstparameterchanges.h"

#include <utility>
#include <vector>

namespace vst3host {

using namespace Steinberg;

// One parameter's points for one block.
class ParamQueue final : public Vst::IParamValueQueue {
public:
    explicit ParamQueue (Vst::ParamID id) : pid (id) {}
    Vst::ParamID PLUGIN_API getParameterId() override { return pid; }
    int32 PLUGIN_API getPointCount() override { return (int32) points.size(); }
    tresult PLUGIN_API getPoint (int32 i, int32& offset, Vst::ParamValue& value) override {
        if (i < 0 || i >= (int32) points.size()) return kResultFalse;
        offset = points[(size_t) i].first;
        value = points[(size_t) i].second;
        return kResultOk;
    }
    tresult PLUGIN_API addPoint (int32 offset, Vst::ParamValue value, int32& i) override {
        points.emplace_back (offset, value);
        i = (int32) points.size() - 1;
        return kResultOk;
    }
    DECLARE_FUNKNOWN_METHODS
private:
    Vst::ParamID pid;
    std::vector<std::pair<int32, Vst::ParamValue>> points;
};
IMPLEMENT_FUNKNOWN_METHODS (ParamQueue, Vst::IParamValueQueue, Vst::IParamValueQueue::iid)

class ParamChanges final : public Vst::IParameterChanges {
public:
    ~ParamChanges() { clear(); }
    int32 PLUGIN_API getParameterCount() override { return (int32) queues.size(); }
    Vst::IParamValueQueue* PLUGIN_API getParameterData (int32 i) override {
        return (i >= 0 && i < (int32) queues.size()) ? queues[(size_t) i] : nullptr;
    }
    Vst::IParamValueQueue* PLUGIN_API addParameterData (const Vst::ParamID& id, int32& i) override {
        for (size_t k = 0; k < queues.size(); ++k) {
            if (queues[k]->getParameterId() != id) continue;
            i = (int32) k;
            return queues[k];
        }
        auto* queue = new ParamQueue (id);
        queue->addRef();
        queues.push_back (queue);
        i = (int32) queues.size() - 1;
        return queue;
    }
    void clear() {
        for (auto* queue : queues) queue->release();
        queues.clear();
    }
    DECLARE_FUNKNOWN_METHODS
private:
    std::vector<ParamQueue*> queues;
};
IMPLEMENT_FUNKNOWN_METHODS (ParamChanges, Vst::IParameterChanges, Vst::IParameterChanges::iid)

class EventList final : public Vst::IEventList {
public:
    int32 PLUGIN_API getEventCount() override { return (int32) events.size(); }
    tresult PLUGIN_API getEvent (int32 i, Vst::Event& e) override {
        if (i < 0 || i >= (int32) events.size()) return kResultFalse;
        e = events[(size_t) i];
        return kResultOk;
    }
    tresult PLUGIN_API addEvent (Vst::Event& e) override {
        events.push_back (e);
        return kResultOk;
    }
    void clear() { events.clear(); }
    DECLARE_FUNKNOWN_METHODS
private:
    std::vector<Vst::Event> events;
};
IMPLEMENT_FUNKNOWN_METHODS (EventList, Vst::IEventList, Vst::IEventList::iid)

// A plugin's component and controller talk through connection points, and the host is the wire. Some plugins build their parameter list
// on the controller only after the component tells them to: without this a controller reports no parameters.
class ConnectionProxy final : public Vst::IConnectionPoint {
public:
    explicit ConnectionProxy (Vst::IConnectionPoint* target) : other (target) {}
    tresult PLUGIN_API connect (Vst::IConnectionPoint*) override { return kResultOk; }
    tresult PLUGIN_API disconnect (Vst::IConnectionPoint*) override { return kResultOk; }
    tresult PLUGIN_API notify (Vst::IMessage* message) override { return other ? other->notify (message) : kResultFalse; }
    DECLARE_FUNKNOWN_METHODS
private:
    Vst::IConnectionPoint* other;
};
IMPLEMENT_FUNKNOWN_METHODS (ConnectionProxy, Vst::IConnectionPoint, Vst::IConnectionPoint::iid)

} // namespace vst3host
