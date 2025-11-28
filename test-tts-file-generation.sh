#!/bin/bash
# TTS Service File Generation Test
# Tests TTS services by generating audio files (no playback required)
# Created: 2025-10-06
# Environment: WSL2/Linux

set -e

OUTPUT_DIR="/tmp/tts-test-output"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "==================================="
echo "TTS Service File Generation Test"
echo "==================================="
echo "Output directory: $OUTPUT_DIR"
echo "Timestamp: $TIMESTAMP"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Test 1: System TTS (espeak)
echo "[1/4] Testing System TTS (espeak)..."
TEST_FILE="$OUTPUT_DIR/system_tts_${TIMESTAMP}.wav"
if espeak "System TTS test via MCP server" -w "$TEST_FILE" 2>/dev/null; then
    if [ -f "$TEST_FILE" ]; then
        SIZE=$(stat -f%z "$TEST_FILE" 2>/dev/null || stat -c%s "$TEST_FILE")
        echo "  ✓ SUCCESS: File created ($SIZE bytes)"
        file "$TEST_FILE" | grep -q "WAVE audio" && echo "  ✓ Valid WAV format"
    else
        echo "  ✗ FAILED: File not created"
    fi
else
    echo "  ✗ FAILED: espeak command failed"
fi
echo ""

# Test 2: espeak with different voice
echo "[2/4] Testing espeak with en-us voice..."
TEST_FILE="$OUTPUT_DIR/espeak_enus_${TIMESTAMP}.wav"
if espeak "Testing English US voice" -v en-us -w "$TEST_FILE" 2>/dev/null; then
    if [ -f "$TEST_FILE" ]; then
        SIZE=$(stat -f%z "$TEST_FILE" 2>/dev/null || stat -c%s "$TEST_FILE")
        echo "  ✓ SUCCESS: File created ($SIZE bytes)"
        file "$TEST_FILE" | grep -q "WAVE audio" && echo "  ✓ Valid WAV format"
    else
        echo "  ✗ FAILED: File not created"
    fi
else
    echo "  ✗ FAILED: espeak command failed"
fi
echo ""

# Test 3: Google TTS (if available)
echo "[3/4] Testing Google TTS (gtts)..."
if command -v python3 &> /dev/null; then
    if python3 -c "import gtts" 2>/dev/null; then
        TEST_FILE="$OUTPUT_DIR/gtts_${TIMESTAMP}.mp3"
        python3 << EOF 2>/dev/null
from gtts import gTTS
tts = gTTS(text='Google TTS test via MCP server', lang='en')
tts.save('$TEST_FILE')
EOF
        if [ -f "$TEST_FILE" ]; then
            SIZE=$(stat -f%z "$TEST_FILE" 2>/dev/null || stat -c%s "$TEST_FILE")
            echo "  ✓ SUCCESS: File created ($SIZE bytes)"
            file "$TEST_FILE" | grep -q "Audio file" && echo "  ✓ Valid MP3 format"
        else
            echo "  ✗ FAILED: File not created"
        fi
    else
        echo "  ⚠ SKIPPED: gtts module not installed"
        echo "    Install with: pip install gtts"
    fi
else
    echo "  ⚠ SKIPPED: Python3 not available"
fi
echo ""

# Test 4: List available voices
echo "[4/4] Listing available espeak voices..."
if espeak --voices 2>/dev/null | head -10; then
    VOICE_COUNT=$(espeak --voices 2>/dev/null | wc -l)
    echo "  ✓ SUCCESS: $VOICE_COUNT voices available"
else
    echo "  ✗ FAILED: Could not list voices"
fi
echo ""

# Summary
echo "==================================="
echo "Test Summary"
echo "==================================="
echo "Output files in: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR/" 2>/dev/null || echo "No files created"
echo ""
echo "Note: Audio playback not tested due to WSL2 limitations"
echo "Files can be played on Windows to verify audio quality"
echo "==================================="
