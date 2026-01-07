# TTS MCP Service User Testing Guide

**Purpose:** Complete testing of TTS MCP services with audio verification

**Environment Required:** Windows (NOT WSL2) - audio device needed

---

## Prerequisites

### 1. Install Missing Python Packages

Open PowerShell or CMD and run:

```powershell
pip install gtts pygame
```

**Verify installation:**
```powershell
python -c "import gtts; import pygame; print('Both modules installed')"
```

Expected output: `Both modules installed`

### 2. Verify MCP Server Connection

1. Open Claude Code
2. Check if `tts-mcp-server` appears in connected servers
3. If not connected, restart Claude Code

### 3. Check Audio Device

Run this in PowerShell:
```powershell
powershell -Command "Add-Type -AssemblyName System.Speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speak.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }"
```

Should list available Windows TTS voices.

---

## Test Sequence

### Test 1: List Available Voices

**In Claude Code, ask:**
> "Use the MCP tool mcp__tts-mcp-server__list_voices to show me available TTS voices"

**Expected Result:**
- Should return a list of espeak voices (76 on Linux, varies on Windows)
- Voices like: en, en-us, en-gb, etc.

**Success Criteria:** ✓ List of voices is returned

---

### Test 2: System TTS (espeak)

**In Claude Code, ask:**
> "Use mcp__tts-mcp-server__speak_text with these parameters:
> - text: 'System TTS test via MCP server'
> - service: 'system'"

**Expected Result:**
- On Windows: Audio plays through speakers
- On Linux: Audio file generated (if no audio device)
- Success message returned

**Success Criteria:** ✓ Text is spoken or file is generated

**Troubleshooting:**
- If no audio: Check Windows volume
- If error: Check espeak is installed: `which espeak` (WSL) or `where espeak` (Windows)

---

### Test 3: Google TTS (gtts)

**In Claude Code, ask:**
> "Use mcp__tts-mcp-server__speak_text with these parameters:
> - text: 'Google TTS test via MCP server'
> - service: 'gtts'"

**Expected Result:**
- Google TTS voice speaks the text
- Success message: "Successfully spoke with Google TTS..."

**Success Criteria:** ✓ Google voice is audibly different from system voice

**Troubleshooting:**
- If "gtts not available": Run `pip install gtts pygame`
- If pygame error: Check pygame is installed
- If no audio: Check speakers/volume

---

### Test 4: ElevenLabs TTS

**In Claude Code, ask:**
> "Use mcp__tts-mcp-server__speak_text with these parameters:
> - text: 'ElevenLabs TTS test via MCP server'
> - service: 'elevenlabs'
> - model: 'eleven_turbo_v2_5'"

**Expected Result:**
- High-quality ElevenLabs voice speaks
- MP3 file saved to: `C:\MCP\tts-mcp-server\output\`
- Success message with voice ID

**Success Criteria:**
- ✓ ElevenLabs voice is noticeably higher quality
- ✓ MP3 file is created in output directory

**Troubleshooting:**
- If API error: Check ElevenLabs API key in `.mcp.json`
- If "API key not found": Verify environment variable is set
- If quota error: Check ElevenLabs account balance
- Check output dir: `dir C:\MCP\tts-mcp-server\output\`

---

### Test 5: Voice Selection (ElevenLabs)

**In Claude Code, ask:**
> "Use mcp__tts-mcp-server__speak_text with these parameters:
> - text: 'Testing voice rotation'
> - service: 'elevenlabs'
> - voice: 'tQ4MEZFJOzsahSEEZtHK'"

**Expected Result:**
- Different ElevenLabs voice than previous test
- Success message showing voice ID: `tQ4MEZFJOzsahSEEZtHK`

**Success Criteria:** ✓ Voice is different from Test 4

---

### Test 6: espeak Voice Selection

**In Claude Code, ask:**
> "Use mcp__tts-mcp-server__speak_text with these parameters:
> - text: 'Testing British English voice'
> - service: 'espeak'
> - voice: 'en-gb'"

**Expected Result:**
- British English accent
- Success message: "Successfully spoke with espeak..."

**Success Criteria:** ✓ Accent is noticeably British

---

### Test 7: Speech Rate Adjustment

**In Claude Code, ask:**
> "Use mcp__tts-mcp-server__speak_text with these parameters:
> - text: 'Testing slow speech rate'
> - service: 'system'
> - rate: 0.5"

**Expected Result:**
- Speech is slower than normal
- Same voice as Test 2 but at half speed

**Success Criteria:** ✓ Speech rate is noticeably slower

---

## Verification Checklist

After completing all tests, verify:

- [ ] Test 1: List voices - ✓ Returned voice list
- [ ] Test 2: System TTS - ✓ Audio played/file generated
- [ ] Test 3: Google TTS - ✓ Audio played with Google voice
- [ ] Test 4: ElevenLabs - ✓ High-quality audio, MP3 file created
- [ ] Test 5: Voice selection - ✓ Different voice used
- [ ] Test 6: espeak voice - ✓ British accent detected
- [ ] Test 7: Rate adjustment - ✓ Slower speech rate

## Output File Verification

**Check output directory:**
```powershell
dir C:\MCP\tts-mcp-server\output\
```

**Expected:** Multiple MP3 files from ElevenLabs tests

**Verify file playback:**
```powershell
# Play the most recent file
$latestFile = Get-ChildItem C:\MCP\tts-mcp-server\output\*.mp3 | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Start-Process $latestFile.FullName
```

## Common Issues

### "Module not found: gtts"
```powershell
pip install gtts pygame
```

### "ElevenLabs API key not found"
Check `.mcp.json` line 120 has API key set

### "No audio device"
- You're in WSL2 - switch to Windows PowerShell
- Or verify speakers are connected and working

### "Cannot connect to PulseAudio"
- WSL2 limitation - use Windows instead
- Or configure PulseAudio bridge (complex)

### "MCP tool not found"
- Restart Claude Code
- Verify `tts-mcp-server` is in `.mcp.json`
- Check MCP server is running: Should auto-start when Claude Code launches

### "Permission denied" or "File not found"
- Check paths in `.mcp.json` are correct
- Verify `C:\MCP\tts-mcp-server\index.js` exists
- Check Node.js is installed: `node --version`

## Success Criteria Summary

**All tests passed if:**
1. ✓ All 7 tests completed without errors
2. ✓ Audio was heard for each test (or files generated on WSL)
3. ✓ Different voices were distinguishable
4. ✓ Rate adjustment was noticeable
5. ✓ ElevenLabs MP3 files were created
6. ✓ No API errors or module errors

## Post-Testing

**Document results:**
1. Note which services worked
2. List any errors encountered
3. Verify output files are valid
4. Check audio quality is acceptable

**Report findings:**
- Service status (working/not working)
- Audio quality assessment
- Any configuration issues found
- Recommendations for production use

---

## Technical Notes

### Service Comparison

| Service | Quality | Speed | Cost | Internet Required |
|---------|---------|-------|------|-------------------|
| System (espeak) | Low | Fast | Free | No |
| Google TTS | Medium | Medium | Free | Yes |
| espeak | Low | Fast | Free | No |
| ElevenLabs | High | Medium | Paid | Yes |

### Recommended Use Cases

- **espeak/system:** Quick testing, offline use, not user-facing
- **Google TTS:** Good balance, free, acceptable quality
- **ElevenLabs:** Production use, customer-facing, premium quality

### API Rate Limits

**ElevenLabs:**
- Free tier: 10,000 characters/month
- Starter: 30,000 characters/month
- Check usage: https://elevenlabs.io/

**Google TTS:**
- Free tier: 1 million characters/month (through Python gtts)
- No authentication required for basic use

---

**For detailed technical analysis, see:** `TTS_MCP_SERVICE_TEST_REPORT.md`
