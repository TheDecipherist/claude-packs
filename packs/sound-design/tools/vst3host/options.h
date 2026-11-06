// The renderer's command line. One row per flag: a new flag is one new row.
#pragma once

#include <cstdint>
#include <cstdlib>
#include <functional>
#include <map>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

namespace vst3host {

struct Axis {
    uint32_t offset = 0;
    int steps = 0;
    int max = 127;
};

struct Options {
    std::string plugin;
    std::string out = "render.wav";
    std::string dir = ".";
    double sampleRate = 44100.0;
    double boot = 1.0;
    double hold = 1.5;
    double tail = 0.6;
    double settle = 0.4;
    int note = 60;
    int velocity = 100;
    int block = 512;
    int program = -1;
    int bankMsb = -1;
    int bankLsb = -1;
    bool list = false;
    bool dumpParams = false;
    std::map<uint32_t, double> params;
    uint32_t sweepId = 0;
    int sweepSteps = 0;
    std::vector<std::string> sysexFiles;
    // A Roland DT1 message is `F0 <head> 12 <address> <value> <sum> F7`. <head> is the maker, device and model: `41 10 00 06`.
    std::vector<unsigned char> dt1Head;
    uint32_t dt1Base = 0;
    std::map<uint32_t, int> dt1;
    Axis dt1Sweep;
    std::vector<Axis> axes;
    int probeLo = -1;
    int probeHi = -1;
    std::vector<int> probeValues { 0, 127 };
    int mapLo = -1;
    int mapHi = -1;
    int mapValue = 100;
};

inline std::vector<std::string> split (const std::string& text, char by) {
    std::vector<std::string> parts;
    std::stringstream stream (text);
    for (std::string part; std::getline (stream, part, by);) parts.push_back (part);
    return parts;
}

inline uint32_t hex (const std::string& text) { return (uint32_t) std::stoul (text, nullptr, 16); }

// OFFSET:STEPS[:MAX], the offset in hex.
inline Axis axisOf (const std::string& text) {
    const auto parts = split (text, ':');
    if (parts.size() < 2) throw std::invalid_argument ("expected OFFSET:STEPS[:MAX], got " + text);
    return { hex (parts[0]), std::stoi (parts[1]), parts.size() > 2 ? std::stoi (parts[2]) : 127 };
}

// LO-HI, in hex, into two ints.
inline void rangeOf (const std::string& text, int& lo, int& hi) {
    const auto parts = split (text, '-');
    if (parts.size() != 2) throw std::invalid_argument ("expected LO-HI, got " + text);
    lo = (int) hex (parts[0]);
    hi = (int) hex (parts[1]);
}

inline void bytesOf (const std::string& text, std::vector<unsigned char>& into) {
    for (const auto& part : split (text, ' ')) into.push_back ((unsigned char) hex (part));
}

inline void probeOf (Options& o, const std::string& text) {
    const auto parts = split (text, ':');
    rangeOf (parts[0], o.probeLo, o.probeHi);
    if (parts.size() < 2) return;
    o.probeValues.clear();
    for (const auto& value : split (parts[1], ',')) o.probeValues.push_back (std::stoi (value));
}

inline void mapOf (Options& o, const std::string& text) {
    const auto parts = split (text, ':');
    rangeOf (parts[0], o.mapLo, o.mapHi);
    if (parts.size() > 1) o.mapValue = std::stoi (parts[1]);
}

inline void paramOf (Options& o, const std::string& text) {
    const auto parts = split (text, '=');
    if (parts.size() != 2) throw std::invalid_argument ("expected ID=VALUE, got " + text);
    o.params[(uint32_t) std::stoul (parts[0])] = std::stod (parts[1]);
}

inline void dt1Of (Options& o, const std::string& text) {
    const auto parts = split (text, '=');
    if (parts.size() != 2) throw std::invalid_argument ("expected OFFSET=VALUE, got " + text);
    o.dt1[hex (parts[0])] = std::stoi (parts[1]);
}

inline void sweepOf (Options& o, const std::string& text) {
    const auto parts = split (text, ':');
    if (parts.size() != 2) throw std::invalid_argument ("expected ID:STEPS, got " + text);
    o.sweepId = (uint32_t) std::stoul (parts[0]);
    o.sweepSteps = std::stoi (parts[1]);
}

inline void bankOf (Options& o, const std::string& text) {
    const auto parts = split (text, ':');
    if (parts.size() != 2) throw std::invalid_argument ("expected MSB:LSB, got " + text);
    o.bankMsb = std::stoi (parts[0]);
    o.bankLsb = std::stoi (parts[1]);
}

using Row = std::function<void (Options&, const std::string&)>;

inline const std::map<std::string, Row>& valueFlags() {
    static const std::map<std::string, Row> rows {
        { "--vst3", [] (Options& o, const std::string& v) { o.plugin = v; } },
        { "--out", [] (Options& o, const std::string& v) { o.out = v; } },
        { "--dir", [] (Options& o, const std::string& v) { o.dir = v; } },
        { "--sr", [] (Options& o, const std::string& v) { o.sampleRate = std::stod (v); } },
        { "--boot", [] (Options& o, const std::string& v) { o.boot = std::stod (v); } },
        { "--hold", [] (Options& o, const std::string& v) { o.hold = std::stod (v); } },
        { "--tail", [] (Options& o, const std::string& v) { o.tail = std::stod (v); } },
        { "--settle", [] (Options& o, const std::string& v) { o.settle = std::stod (v); } },
        { "--note", [] (Options& o, const std::string& v) { o.note = std::stoi (v); } },
        { "--vel", [] (Options& o, const std::string& v) { o.velocity = std::stoi (v); } },
        { "--block", [] (Options& o, const std::string& v) { o.block = std::stoi (v); } },
        { "--program", [] (Options& o, const std::string& v) { o.program = std::stoi (v); } },
        { "--bank", bankOf },
        { "--param", paramOf },
        { "--sweep", sweepOf },
        { "--sysex", [] (Options& o, const std::string& v) { o.sysexFiles.push_back (v); } },
        { "--dt1-head", [] (Options& o, const std::string& v) { bytesOf (v, o.dt1Head); } },
        { "--dt1-base", [] (Options& o, const std::string& v) { o.dt1Base = hex (v); } },
        { "--dt1", dt1Of },
        { "--sweep-dt1", [] (Options& o, const std::string& v) { o.dt1Sweep = axisOf (v); } },
        { "--axis", [] (Options& o, const std::string& v) { o.axes.push_back (axisOf (v)); } },
        { "--probe", probeOf },
        { "--map", mapOf },
    };
    return rows;
}

inline Options parseOptions (int argc, char** argv) {
    Options o;
    for (int i = 1; i < argc; ++i) {
        const std::string flag = argv[i];
        if (flag == "--list") o.list = true;
        else if (flag == "--dump-params") o.dumpParams = true;
        else {
            const auto row = valueFlags().find (flag);
            if (row == valueFlags().end()) throw std::invalid_argument ("unknown flag " + flag);
            if (i + 1 >= argc) throw std::invalid_argument (flag + " needs a value");
            row->second (o, argv[++i]);
        }
    }
    if (o.plugin.empty()) throw std::invalid_argument ("name the plugin: --vst3 <path>");
    return o;
}

} // namespace vst3host
