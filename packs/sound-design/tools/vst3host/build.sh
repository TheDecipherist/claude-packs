#!/usr/bin/env bash
# Builds the offline VST3 renderer on macOS or Linux. It links the VST3 SDK a project's JUCE already holds, and must not link JUCE itself: that is the
# whole point, since a JUCE host cannot load every JUCE plugin. Run it from the project root, after the project's first configure has fetched JUCE.
#   bash .claude/tools/vst3host/build.sh [out-dir]      VST3_SDK=<dir> names the SDK; otherwise it is looked for under JUCE
# The source list took finding, so it is written here: the SDK inside JUCE is trimmed, and each of these has to be named.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="${1:-out/vst3host}"

find_sdk() {
  local root module
  if [[ -n "${VST3_SDK:-}" ]]; then
    printf '%s\n' "$VST3_SDK"
    return 0
  fi
  for root in out/*/_deps/juce-src build/_deps/juce-src build/*/_deps/juce-src cmake-build-*/_deps/juce-src JUCE third_party/JUCE; do
    for module in juce_audio_processors_headless juce_audio_processors; do
      if [[ -d "$root/modules/$module/format_types/VST3_SDK/public.sdk" ]]; then
        printf '%s\n' "$PWD/$root/modules/$module/format_types/VST3_SDK"
        return 0
      fi
    done
  done
  return 1
}

if ! sdk="$(find_sdk)"; then
  echo "build.sh: no VST3 SDK found. Configure the project so JUCE is fetched, or set VST3_SDK to the folder." >&2
  exit 1
fi

sources=(
  public.sdk/source/vst/hosting/module.cpp
  public.sdk/source/vst/hosting/hostclasses.cpp
  public.sdk/source/vst/hosting/pluginterfacesupport.cpp
  public.sdk/source/vst/vstinitiids.cpp
  public.sdk/source/vst/utility/stringconvert.cpp
  public.sdk/source/common/commonstringconvert.cpp
  public.sdk/source/common/memorystream.cpp
  pluginterfaces/base/funknown.cpp
  pluginterfaces/base/coreiids.cpp
  pluginterfaces/base/conststringtable.cpp
  pluginterfaces/base/ustring.cpp
  base/source/fobject.cpp
  base/source/fstring.cpp
  base/source/fdebug.cpp
  base/source/fbuffer.cpp
  base/source/baseiids.cpp
  base/source/fstreamer.cpp
  base/thread/source/flock.cpp
)
paths=()
for source in "${sources[@]}"; do
  paths+=("$sdk/$source")
done

mkdir -p "$out"
flags=(-std=c++17 -O2 -DRELEASE=1 -I"$sdk" -I"$here")
case "$(uname -s)" in
  Darwin)
    clang++ "${flags[@]}" -fobjc-arc -c "$sdk/public.sdk/source/vst/hosting/module_mac.mm" -o "$out/module_mac.o"
    clang++ "${flags[@]}" "$here/render.cpp" "$out/module_mac.o" "${paths[@]}" -framework CoreFoundation -framework Foundation -o "$out/render"
    ;;
  Linux)
    "${CXX:-g++}" "${flags[@]}" "$here/render.cpp" "$sdk/public.sdk/source/vst/hosting/module_linux.cpp" "${paths[@]}" -ldl -lpthread -o "$out/render"
    ;;
  *)
    echo "build.sh: macOS and Linux only. On Windows, build render.cpp with module_win32.cpp and the same sources." >&2
    exit 1
    ;;
esac
echo "built $out/render"
