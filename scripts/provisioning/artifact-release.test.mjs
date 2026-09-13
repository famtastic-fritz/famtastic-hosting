import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { main, makePackage, sha } from './artifact-release.mjs';
const manifest={schema:'famtastic.hosting-provision.v1',site_id:'test-site',customer_ref:'drupal:customer:1',request_ref:'drupal:request:1',domain:'test.example.com',hosting:{account:'testuser',main_domain:'main.example.com',subdomain_label:'test-site',document_root:'customer-sites/test-site/public'},mailboxes:[]};
test('package rejects unsafe paths and corrupt hashes',()=>{ const f={path:'index.html',base64:Buffer.from('hi').toString('base64'),sha256:sha('hi')}; const src={commit:'a'.repeat(40),ref:'refs/heads/main'}; assert.equal(makePackage(manifest,src,[f]).files.length,1); for(const path of ['../index.html','private/index.html','.well-known/index.html']) assert.throws(()=>makePackage(manifest,src,[f,{...f,path}])); assert.throws(()=>makePackage(manifest,src,[{...f,sha256:'0'.repeat(64)}])); });
test('real local git origin proves pushed clean source; dirty/unpushed/symlink rejected; deploy dry run does not SSH',async()=>{
 const root=await mkdtemp(join(tmpdir(),'artifact-git-')); const repo=join(root,'repo'),remote=join(root,'remote.git');
 const git=(...args)=>execFileSync('git',args,{cwd:repo,stdio:['ignore','pipe','pipe']});
 try { await mkdir(repo); execFileSync('git',['init','--bare',remote],{stdio:'ignore'}); git('init','-b','main'); git('config','user.name','Local Test'); git('config','user.email','test@example.invalid'); git('remote','add','origin',remote); await mkdir(join(repo,'release')); await writeFile(join(repo,'release/index.html'),'test'); git('add','.'); git('commit','-m','fixture'); git('push','origin','main'); const mf=join(root,'manifest.json'); await writeFile(mf,JSON.stringify(manifest));
 const args=out=>['build','--repo',repo,'--manifest',mf,'--source-dir','release','--ref','refs/heads/main','--file','index.html','--output',join(root,out)];
 const r=await main(args('package.json')); assert.equal(r.status,'packaged'); const dry=await main(['deploy','--package',join(root,'package.json'),'--ssh','testuser@invalid.example']); assert.equal(dry.network_writes,0); await assert.rejects(main(['deploy','--package',join(root,'package.json'),'--ssh','wrong@invalid.example']));
 await writeFile(join(repo,'dirty'),'x'); await assert.rejects(main(args('dirty.json'))); await rm(join(repo,'dirty')); await writeFile(join(repo,'release/index.html'),'next'); git('add','.');git('commit','-m','unpushed');await assert.rejects(main(args('unpushed.json')));git('push','origin','main');await rm(join(repo,'release/index.html'));await symlink('other.html',join(repo,'release/index.html'));git('add','.');git('commit','-m','symlink');git('push','origin','main');await assert.rejects(main(args('symlink.json')));
 } finally { await rm(root,{recursive:true,force:true}); }
});
