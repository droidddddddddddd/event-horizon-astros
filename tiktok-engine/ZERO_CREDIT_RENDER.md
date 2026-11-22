# Zero-credit production fallback

When ElevenLabs cannot render 5-second video clips within the remaining credit balance, **do not automatically retry or purchase credits**.

A 25-second 720x1280 MP4 proof-of-concept was rendered locally using Pillow and FFmpeg with five original illustrated placeholder scene cards and a quiet synthesized audio bed. This proves the vertical video container and scene timing, **not** approved character continuity or voice integration.

## Production path without additional ElevenLabs credits
1. Open the existing ElevenLabs flow `jXYnwKfyfUiBnW5VqMB9`.
2. Export the original ASTROS Episode 001 storyboard reference and the **two completed audio generations** (IDs `vIf7kxoiF6LZvYGpP1K1` and `n8BdqVIHVrmzHdz4yHH7`). Their short-lived download links must not be committed to Git.
3. Split the storyboard into five full-frame crops or use individual approved NFT artwork images. **Review every crop for identity consistency**.
4. Use FFmpeg/Pillow to animate slow camera pushes, parallax, subtle starfield movement and captions. Mix the existing voiceovers against licensed/original ambient audio, and time each dialogue line to its scene.
5. Export 1080x1920 H.264 MP4, inspect subtitles/audio, and manually approve before posting.
6. Avoid using ElevenLabs video-generation nodes while their minimum credit cost exceeds the account balance.

The current locally rendered video is a technical proof of concept only. It is not ready for publication as the official ASTROS episode.
