#!/bin/sh
# Renders review/fitila_themed_clips_review.mp4: the four Fitila clips framed by their real app
# colours. Clips are decoded to RGB with the BT.709 matrix BEFORE padding, so the frame colour
# matches what browsers show (padding in YUV with ffmpeg's default matrix fakes a visible box).
cd "$(dirname "$0")/.." || exit 1
DEC="scale=in_color_matrix=bt709:in_range=tv:flags=accurate_rnd+full_chroma_int,format=rgb24"
ENC="scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int+full_chroma_inp,format=yuv420p"
mkdir -p review
ffmpeg -v error -y \
  -i media/fitila_greet_light.mp4 -i media/fitila_greet_dark.mp4 \
  -stream_loop 1 -i media/fitila_tap_light.mp4 -stream_loop 1 -i media/fitila_tap_dark.mp4 \
  -filter_complex "\
[0:v]$DEC,pad=920:800:46:40:color=0xF0F8FD[a];\
[1:v]$DEC,pad=920:800:46:40:color=0x0E1B29[b];\
[2:v]$DEC,scale=-2:720,pad=920:800:(ow-iw)/2:40:color=0xFFFFFF[c];\
[3:v]$DEC,scale=-2:720,pad=920:800:(ow-iw)/2:40:color=0x162839[d];\
[a][b]hstack[top];[c][d]hstack[bot];[top][bot]vstack,scale=1380:-2,$ENC" \
  -t 5 -c:v libx264 -crf 18 -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv \
  -movflags +faststart review/fitila_themed_clips_review.mp4
