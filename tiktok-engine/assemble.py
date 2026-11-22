#!/usr/bin/env python3
"""Assemble already-generated clips into one 9:16 review video using FFmpeg.
No API calls and no publishing. Requires 5 approved clips of equal length.
"""
import argparse,json,pathlib,shutil,subprocess,tempfile
ROOT=pathlib.Path(__file__).resolve().parent
def run(args):
 p=subprocess.run(args,capture_output=True,text=True)
 if p.returncode: raise RuntimeError(p.stderr[-2500:])
def main():
 p=argparse.ArgumentParser()
 p.add_argument("--clips",nargs=5,required=True,help="Five approved video clips, in storyboard order")
 p.add_argument("--output",required=True)
 p.add_argument("--episode",default=str(ROOT/"episode_001.json"))
 a=p.parse_args()
 if not shutil.which("ffmpeg"): raise SystemExit("ffmpeg is required")
 if not shutil.which("ffprobe"): raise SystemExit("ffprobe is required")
 episode=json.loads(pathlib.Path(a.episode).read_text())
 if len(episode["scenes"])!=5: raise ValueError("Expected five storyboard scenes")
 out=pathlib.Path(a.output).resolve()
 out.parent.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory() as tmp:
  normalized=[]
  for i,clip in enumerate(a.clips):
   source=pathlib.Path(clip).resolve()
   if not source.is_file(): raise FileNotFoundError(source)
   target=pathlib.Path(tmp)/f"scene_{i:02}.mp4"
   run(["ffmpeg","-y","-i",str(source),"-t","5","-vf",
        "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30",
        "-an","-c:v","libx264","-pix_fmt","yuv420p","-preset","fast",str(target)])
   normalized.append(target)
  concat=pathlib.Path(tmp)/"clips.txt"
  concat.write_text("".join("file '"+str(x).replace("'","'\\''")+"'\n" for x in normalized))
  run(["ffmpeg","-y","-f","concat","-safe","0","-i",str(concat),
       "-c:v","copy","-movflags","+faststart",str(out)])
 print(f"Review-only video created: {out}. Add licensed audio/voices and captions before publishing.")
if __name__=="__main__":main()
