// Offline VST3 renderer: play a known note through a plugin and write what comes out, with no DAW, audio device or window.
//   render --vst3 Plugin.vst3 --list                                  every parameter, with its id
//   render --vst3 Plugin.vst3 --out a.wav --note 60 --hold 1.5        one note
//   render --vst3 Plugin.vst3 --sweep 38:9 --dir out/                 one note per value of parameter 38
//   render --vst3 Plugin.vst3 --sysex patch.syx --dump-params         send a patch, and read whether it was taken
// The `bounce-a-plugin` skill says how to use it and what it took to learn.
#include "session.h"

#include <fstream>
#include <iterator>
#include <stdexcept>

using namespace vst3host;

namespace {

template <typename T> void put (FILE* f, T value) { std::fwrite (&value, sizeof value, 1, f); }

// 32-bit float, so a plugin that peaks over 1.0 is measured and never clipped.
void writeWav (const std::string& path, Session& session, double sampleRate) {
    const auto& left = session.keptLeft();
    const auto& right = session.keptRight();
    const auto bytes = (uint32_t) (left.size() * 2 * sizeof (float));
    FILE* f = std::fopen (path.c_str(), "wb");
    if (! f) throw std::runtime_error ("cannot write " + path);
    std::fwrite ("RIFF", 1, 4, f);
    put<uint32_t> (f, 36 + bytes);
    std::fwrite ("WAVEfmt ", 1, 8, f);
    put<uint32_t> (f, 16);
    put<uint16_t> (f, 3);
    put<uint16_t> (f, 2);
    put<uint32_t> (f, (uint32_t) sampleRate);
    put<uint32_t> (f, (uint32_t) sampleRate * 8);
    put<uint16_t> (f, 8);
    put<uint16_t> (f, 32);
    std::fwrite ("data", 1, 4, f);
    put<uint32_t> (f, bytes);
    for (size_t i = 0; i < left.size(); ++i) {
        put<float> (f, left[i]);
        put<float> (f, right[i]);
    }
    std::fclose (f);
}

void oneNote (Session& session, const Options& o, const std::string& file) {
    session.clearKept();
    session.run (o.settle, false); // let the DSP finish slewing its coefficients
    session.noteOn (o.note, o.velocity);
    session.run (o.hold, true);
    session.noteOff (o.note);
    session.run (o.tail, true);
    double peak = 0;
    double sum = 0;
    const auto& left = session.keptLeft();
    const auto& right = session.keptRight();
    for (size_t i = 0; i < left.size(); ++i) {
        const double mid = 0.5 * (left[i] + right[i]);
        peak = std::max (peak, std::abs (mid));
        sum += mid * mid;
    }
    writeWav (file, session, o.sampleRate);
    std::printf ("  %s  %.2fs  peak %.5f  rms %.6f\n", file.c_str(), left.size() / o.sampleRate, peak, std::sqrt (sum / std::max<size_t> (1, left.size())));
}

std::vector<unsigned char> dt1Message (const Options& o, uint32_t address, int value) {
    if (o.dt1Head.empty()) throw std::invalid_argument ("a DT1 flag needs --dt1-head, the maker, device and model: `41 10 00 06`");
    std::vector<unsigned char> message { 0xF0 };
    message.insert (message.end(), o.dt1Head.begin(), o.dt1Head.end());
    message.push_back (0x12);
    int sum = 0;
    for (int shift = 24; shift >= 0; shift -= 8) {
        const auto byte = (unsigned char) ((address >> shift) & 0x7F);
        message.push_back (byte);
        sum += byte;
    }
    const auto byte = (unsigned char) (value & 0x7F);
    message.push_back (byte);
    message.push_back ((unsigned char) ((128 - ((sum + byte) % 128)) & 0x7F));
    message.push_back (0xF7);
    return message;
}

void sendDt1 (Session& session, const Options& o, uint32_t offset, int value) { session.sendBytes (dt1Message (o, o.dt1Base + offset, value)); }

// One batch, then one settle, then the note: writes spread one per block made levels wander 8 dB between steps of a sweep.
void sendBaseline (Session& session, const Options& o) {
    for (const auto& [offset, value] : o.dt1) sendDt1 (session, o, offset, value);
}

void sendProgram (Session& session, const Options& o) {
    if (o.program < 0) return;
    if (o.bankMsb >= 0) {
        session.sendBytes ({ 0xB0, 0x00, (unsigned char) o.bankMsb });
        session.sendBytes ({ 0xB0, 0x20, (unsigned char) o.bankLsb });
    }
    session.sendBytes ({ 0xC0, (unsigned char) (o.program & 0x7F) });
    session.run (0.6, false);
}

// A file may hold several messages: split on F0..F7 and sent one per settle, since a synth's MIDI input is a byte stream and a dump is long.
void sendSysexFile (Session& session, const std::string& path) {
    std::ifstream in (path, std::ios::binary);
    if (! in) throw std::runtime_error ("cannot read " + path);
    const std::vector<unsigned char> all ((std::istreambuf_iterator<char> (in)), std::istreambuf_iterator<char>());
    size_t sent = 0;
    for (size_t i = 0; i < all.size();) {
        const auto start = std::find (all.begin() + (long) i, all.end(), (unsigned char) 0xF0);
        const auto end = std::find (start, all.end(), (unsigned char) 0xF7);
        if (end == all.end()) break;
        session.sendBytes (std::vector<unsigned char> (start, end + 1));
        session.run (0.05, false);
        sent += 1;
        i = (size_t) (end - all.begin()) + 1;
    }
    std::printf ("  sent %zu sysex message(s) from %s\n", sent, path.c_str());
    session.run (0.5, false);
}

std::string named (const Options& o, const char* format, unsigned a, int b) {
    char name[256];
    std::snprintf (name, sizeof name, format, a, b);
    return o.dir + "/" + name;
}

// Which parameter is this address? Ask the plugin: what it reports, or else what moved on the controller.
void mapOffsets (Session& session, const Options& o) {
    auto* controller = session.editController();
    std::printf ("  offset -> parameter, as the plugin reports it\n");
    std::vector<double> was;
    const int32 count = controller ? controller->getParameterCount() : 0;
    const auto valueOf = [&] (int32 i) {
        Vst::ParameterInfo info {};
        return controller->getParameterInfo (i, info) == kResultOk ? controller->getParamNormalized (info.id) : 0.0;
    };
    for (int32 i = 0; i < count; ++i) was.push_back (valueOf (i));
    for (int offset = o.mapLo; offset <= o.mapHi; ++offset) {
        session.reported().clear();
        sendDt1 (session, o, (uint32_t) offset, o.mapValue);
        session.run (0.25, false);
        std::printf ("    0x%02x ", offset);
        int moved = session.reported().getParameterCount();
        for (int32 i = 0; i < count; ++i) {
            const double now = valueOf (i);
            if (std::abs (now - was[(size_t) i]) <= 1e-6) continue;
            Vst::ParameterInfo info {};
            controller->getParameterInfo (i, info);
            std::printf (" %s = %.4f", titleOf (info).c_str(), now);
            was[(size_t) i] = now;
            moved += 1;
        }
        std::printf (moved ? "\n" : " (nothing reported, nothing moved)\n");
    }
}

// Which offset IS the control? Each render puts the whole range back to rest first: without it the loop is cumulative, and each offset is measured on the last.
void probeOffsets (Session& session, const Options& o) {
    for (int offset = o.probeLo; offset <= o.probeHi; ++offset) {
        for (const int value : o.probeValues) {
            for (int other = o.probeLo; other <= o.probeHi; ++other) sendDt1 (session, o, (uint32_t) other, o.probeValues.front());
            sendBaseline (session, o);
            sendDt1 (session, o, (uint32_t) offset, value);
            session.run (0.3, false);
            oneNote (session, o, named (o, "probe_%02x_%03d.wav", (unsigned) offset, value));
        }
    }
}

int stepValue (const Axis& axis, int step) { return axis.steps == 1 ? 0 : step * axis.max / (axis.steps - 1); }

// Every combination of the axes, outermost first.
void walkAxes (Session& session, const Options& o, size_t depth, std::string name) {
    if (depth == o.axes.size()) {
        session.run (0.3, false);
        return oneNote (session, o, o.dir + "/ax" + name + ".wav");
    }
    const auto& axis = o.axes[depth];
    for (int step = 0; step < axis.steps; ++step) {
        const int value = stepValue (axis, step);
        if (depth == 0) sendBaseline (session, o);
        sendDt1 (session, o, axis.offset, value);
        walkAxes (session, o, depth + 1, name + "_" + std::to_string (axis.offset) + "-" + std::to_string (value));
    }
}

void sweepDt1 (Session& session, const Options& o) {
    for (int step = 0; step < o.dt1Sweep.steps; ++step) {
        const int value = stepValue (o.dt1Sweep, step);
        sendBaseline (session, o);
        sendDt1 (session, o, o.dt1Sweep.offset, value);
        session.run (0.3, false);
        oneNote (session, o, named (o, "dt1_%02x_%03d.wav", o.dt1Sweep.offset, value));
    }
}

// One note per value, never a knob turned under a sounding note: a swept knob measures a ramp, and a host may drop the note-off.
void sweepParam (Session& session, const Options& o) {
    for (int step = 0; step < o.sweepSteps; ++step) {
        const double value = o.sweepSteps > 1 ? (double) step / (o.sweepSteps - 1) : 0.0;
        for (const auto& [id, frozen] : o.params) session.setParam (id, frozen);
        session.setParam (o.sweepId, value);
        oneNote (session, o, named (o, "param%u_step%02d.wav", o.sweepId, step));
    }
}

void render (Session& session, const Options& o) {
    if (o.mapLo >= 0) mapOffsets (session, o);
    else if (o.probeLo >= 0) probeOffsets (session, o);
    else if (! o.axes.empty()) walkAxes (session, o, 0, "");
    else if (o.dt1Sweep.steps > 0) sweepDt1 (session, o);
    else if (o.sweepSteps > 0) sweepParam (session, o);
    else oneNote (session, o, o.out);
}

int run (const Options& o) {
    Session session (o);
    if (const auto failed = session.open (o.plugin); ! failed.empty()) throw std::runtime_error (failed);
    if (o.list) {
        session.printParameters (false);
        return 0;
    }
    if (const auto failed = session.start(); ! failed.empty()) throw std::runtime_error (failed);
    session.run (o.boot, false); // an emulated firmware boots on a clock: it needs real samples before it answers a note
    for (const auto& [id, value] : o.params) session.setParam (id, value);
    sendProgram (session, o);
    for (const auto& file : o.sysexFiles) sendSysexFile (session, file);
    if (! o.dt1.empty()) {
        sendBaseline (session, o);
        session.run (0.3, false);
    }
    if (o.dumpParams) session.printParameters (true);
    render (session, o);
    session.stop();
    return 0;
}

} // namespace

int main (int argc, char** argv) {
    try {
        return run (parseOptions (argc, argv));
    } catch (const std::exception& e) {
        std::fprintf (stderr, "render: %s\n", e.what());
        return 1;
    }
}
