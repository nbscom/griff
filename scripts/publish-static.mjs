// GitHub Pages is configured to publish main:/ in this repository.
// Keep the generated root entry and assets identical to the Pages artifact.
import {cp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
await rm(new URL('assets/',root),{recursive:true,force:true});
await cp(new URL('dist/assets/',root),new URL('assets/',root),{recursive:true});
await cp(new URL('dist/index.html',root),new URL('index.html',root));
console.log('Prepared main:/ static site (index.html + assets/).');
