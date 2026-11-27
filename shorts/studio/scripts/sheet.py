import sys
from PIL import Image
pre, fs, out = sys.argv[1], [int(x) for x in sys.argv[2].split(',')], sys.argv[3]
ims=[Image.open(f'{pre}{f}.jpg') for f in fs]; w,h=ims[0].size; cols=min(len(ims),7); rows=(len(ims)+cols-1)//cols
s=Image.new('RGB',(w*cols,h*rows))
for i,im in enumerate(ims): s.paste(im,((i%cols)*w,(i//cols)*h))
s.resize((w*cols*360//w, h*rows*360//w)).save(out)
