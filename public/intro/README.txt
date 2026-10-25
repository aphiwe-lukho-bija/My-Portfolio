Put the finished opening film here as:  intro.mp4

- silent (no audio track), H.264, yuv420p, with +faststart
- 16:9, 1920x1080 is plenty; aim for under about 4 MB
- until this file exists the site simply skips the intro and shows the portfolio

Shrink and prepare it with:
  ffmpeg -i intro_raw.mp4 -an -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -movflags +faststart intro.mp4
