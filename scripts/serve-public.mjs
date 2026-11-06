import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const project=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
export function publicServer(root=path.join(project,'dist')){
  root=path.resolve(root);
  return http.createServer(async(req,res)=>{
    try{
      let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(pathname.endsWith('/'))pathname+='index.html';
      const target=path.resolve(root,'.'+pathname);
      if(!target.startsWith(root+path.sep)||pathname.split('/').some(p=>p.startsWith('.'))){res.writeHead(404);res.end('Not found');return;}
      const body=await fs.readFile(target);
      res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});res.end(body);
    }catch{res.writeHead(404);res.end('Not found');}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const server=publicServer();server.listen(Number(process.env.GUIDE_PORT||4317),'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${server.address().port}`));
}
