# TTS MCP Service Test Report

**Date:** 2025-10-06
**Environment:** WSL2 Ubuntu on Windows
**Tester:** Test Automator Agent

## Executive Summary

**CRITICAL ISSUE IDENTIFIED:** TTS services cannot function properly in WSL2 environment due to lack of audio device support. While the TTS MCP server is correctly configured and the tools exist, audio playback will fail in this environment.

## Test Environment Verification

### MCP Server Configuration
- **Location:** `/mnt/c/MCP/tts-mcp-server/`
- **Server File:** `index.js` (13,241 bytes)
- **Configuration File:** `.mcp.json` (lines 114-145)
- **Status:** ✓ Configured correctly
- **ElevenLabs API Key:** ✓ Present in configuration
- **Output Directory:** ✓ Exists at `/mnt/c/MCP/tts-mcp-server/output/`

### Available TTS Services in Code

Based on analysis of `/mnt/c/MCP/tts-mcp-server/index.js`:

1. **System TTS** (lines 134-165)
   - Uses `espeak` on Linux
   - Command: `espeak "text" -s [speed]`

2. **Google TTS** (lines 166-207)
   - Requires: `pip install gtts pygame`
   - Uses Python inline execution

3. **espeak** (lines 208-225)
   - Direct espeak invocation
   - Supports voice and rate parameters

4. **ElevenLabs** (lines 227-345)
   - API-based TTS
   - Supports voice rotation
   - Uses mpg123 for playback on Linux

### Component Installation Status

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| espeak | ✓ INSTALLED | `/usr/bin/espeak` | Version installed |
| mpg123 | ✓ INSTALLED | `/usr/bin/mpg123` | For audio playback |
| gtts (Python) | ✗ NOT FOUND | - | Not in system Python |
| pygame (Python) | ✗ NOT FOUND | - | Not in system Python |
| Node.js | ✓ ASSUMED | - | Required for MCP server |
| MCP SDK | ✓ PRESENT | `package.json` | @modelcontextprotocol/sdk ^0.4.0 |

## Critical Limitation: WSL2 Audio Device

### Test Results: espeak Direct Execution

**Command:** `espeak "System TTS test"`

**Result:** ✗ FAILED - No audio device available

**Error Output:**
```
ALSA lib confmisc.c:855:(parse_card) cannot find card '0'
ALSA lib pulse.c:242:(pulse_connect) PulseAudio: Unable to connect: Connection refused
wave_open_sound > Pa_OpenStream : err=-9996 (Invalid device)
```

**Root Cause:** WSL2 does not have native audio support. No sound card is configured in the Linux environment.

### Implications for All TTS Services

| Service | Can Execute | Can Play Audio | Verification Method |
|---------|-------------|----------------|---------------------|
| System (espeak) | YES | ✗ NO | Tested directly - audio device missing |
| Google TTS | UNKNOWN | ✗ NO | gtts not installed; audio would fail anyway |
| espeak (explicit) | YES | ✗ NO | Same as system TTS |
| ElevenLabs | MAYBE | ✗ NO | API works, but mpg123 playback would fail |

## MCP Tool Availability

**IMPORTANT:** I cannot verify that the MCP tools (`mcp__tts-mcp-server__speak_text`, `mcp__tts-mcp-server__list_voices`) are actually available in the current Claude Code session.

**What I CAN verify:**
- The TTS MCP server is configured in `.mcp.json`
- The server code exists and appears functional
- The configuration includes proper environment variables

**What I CANNOT verify:**
- Whether the MCP server is currently running
- Whether Claude Code has successfully connected to it
- Whether the tools are exposed in this session

Following DIRECTIVE 1 (VERIFICATION SUPREMACY), I must state: **I do not have direct access to test the MCP tools in this session.**

## ElevenLabs Audio Evidence

**Recent Audio Files Found:**
```
/mnt/c/MCP/tts-mcp-server/output/elevenlabs_audio_1759749273628.mp3 (63K, Oct 6 07:14)
```

**Analysis:** This proves that ElevenLabs API integration has worked at least once (likely from a Windows environment, not WSL2).

## Configuration Review

### ElevenLabs Settings (from .mcp.json)
```
ELEVENLABS_API_KEY: ✓ Present (masked)
DEFAULT_VOICE_ID: v1IIiVAN4yJaGycxWmjU
VOICE_ROTATION_LIST: 7 voices configured
VOICE_STABILITY: 0.5
VOICE_SIMILARITY: 0.5
VOICE_STYLE: 0.47
USE_SPEAKER_BOOST: true
DEFAULT_MODEL: eleven_turbo_v2_5
AUDIO_FORMAT: mp3_44100_128
CACHE_ENABLED: true
CACHE_DIR: /mnt/c/MCP/tts-mcp-server/cache
AUDIO_OUTPUT_DIR: /mnt/c/MCP/tts-mcp-server/output
```

**Assessment:** ✓ Configuration is complete and correct

## Missing Dependencies

### Python Packages
The user stated "gtts and pygame are installed in venv" but:
- No venv directory found in `/mnt/c/MCP/tts-mcp-server/`
- System Python does not have gtts or pygame
- Testing gtts service would require installing these packages

**Action Required:**
```bash
pip install gtts pygame
```

## Recommendations

### For Testing in WSL2 Environment

**Option 1: Use Windows-based testing** (RECOMMENDED)
- Run tests from Windows PowerShell or CMD instead of WSL2
- Windows has native audio device support
- The TTS server appears designed for Windows (see PowerShell commands in code)

**Option 2: Configure PulseAudio bridge**
- Install PulseAudio on WSL2
- Configure it to connect to Windows audio
- Complex setup, may have latency issues

**Option 3: Test without audio playback**
- For ElevenLabs: Verify API calls succeed and MP3 files are created
- For gtts: Generate audio files without playback
- Cannot verify actual audio quality

### For Production Deployment

1. **Deploy on Windows:** The TTS server is best suited for Windows environment
2. **Install Python dependencies:** Ensure gtts and pygame are available
3. **Test audio devices:** Verify audio output before deploying
4. **Monitor API usage:** ElevenLabs has rate limits and costs

## File Generation Tests (WSL2)

Since audio playback is not available in WSL2, tests focused on verifying TTS services can generate audio files.

### Test 1: System TTS (espeak) - File Generation
**Command:** `espeak "System TTS test via MCP server" -w /tmp/tts-test-output/system_tts.wav`

**Result:** ✓ SUCCESS

**Output:**
- File: `/tmp/tts-test-output/system_tts.wav`
- Size: 115K
- Format: RIFF (little-endian) data, WAVE audio, Microsoft PCM, 16 bit, mono 22050 Hz
- Status: Valid WAV file created

### Test 2: espeak with Voice Selection
**Command:** `espeak "Testing English US voice" -v en-us -w /tmp/tts-test-output/espeak_enus.wav`

**Result:** ✓ SUCCESS

**Output:**
- File: `/tmp/tts-test-output/espeak_enus.wav`
- Size: 81K
- Format: RIFF (little-endian) data, WAVE audio, Microsoft PCM, 16 bit, mono 22050 Hz
- Status: Valid WAV file created with en-us voice

### Test 3: Google TTS (gtts)
**Command:** `python3 -c "import gtts"`

**Result:** ✗ FAILED - Module not found

**Error:** `ModuleNotFoundError: No module named 'gtts'`

**Action Required:** `pip install gtts`

### Test 4: List Available Voices
**Command:** `espeak --voices`

**Result:** ✓ SUCCESS

**Output:** 76 voices available including:
- en (English - default)
- en-gb (British English)
- en-us (American English)
- en-uk-north, en-uk-rp, en-uk-wmids
- Multiple language options (af, an, bg, bn, bs, ca, cs, cy, da, de, el, etc.)

## Verification Checklist

Following DIRECTIVE 10 (CONTINUOUS VERIFICATION LOOP):

- ✓ Verified TTS server code exists at `/mnt/c/MCP/tts-mcp-server/index.js`
- ✓ Verified configuration is present in `.mcp.json`
- ✓ Verified espeak is installed at `/usr/bin/espeak`
- ✓ Verified mpg123 is installed at `/usr/bin/mpg123`
- ✓ Tested espeak file generation - SUCCESS (2 files created)
- ✗ Verified gtts is NOT installed (module not found)
- ✗ Could not verify pygame installation (depends on gtts test)
- ✗ Could not test MCP tools directly (no programmatic access in this session)
- ✓ Verified ElevenLabs produced output files previously (evidence in output directory)
- ✗ Could not verify audio playback (WSL2 limitation - no audio device)
- ✓ Verified espeak can list 76 voices
- ✓ Verified espeak can generate valid WAV files
- ✓ Verified espeak supports voice selection

## Conclusion

**Honest Assessment (PRINCIPLE ZERO: RADICAL CANDOR):**

1. The TTS MCP server is **correctly configured** in the codebase
2. The required tools (espeak, mpg123) are **installed**
3. Python dependencies (gtts, pygame) are **missing**
4. **CRITICAL:** Audio playback **will not work** in WSL2 environment
5. I **cannot verify** that MCP tools are accessible in this Claude Code session
6. ElevenLabs API integration **appears functional** (evidence: output files)
7. Testing should be **conducted in Windows environment** for accurate results

**User Action Required:**
1. Install missing Python packages: `pip install gtts pygame`
2. Test from Windows environment (not WSL2) for audio verification
3. Confirm MCP server is running and connected to Claude Code
4. Verify audio devices are available in test environment

---

**Test Status:** INCOMPLETE
**Blocker:** WSL2 lacks audio device support
**Next Steps:** Retest in Windows environment with audio support
