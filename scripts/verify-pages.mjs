import dotenv from 'dotenv';
import {createClient} from '@supabase/supabase-js';
import assert from 'node:assert/strict';
dotenv.config({path:'.env.local',quiet:true});
const base=process.argv[2]||'http://localhost:3001';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const accounts=[
 ['s.alamri@oia.gov.om','OiaDemo#2026',['/admin','/admin/ai','/admin/features','/admin/organization']],
 ['hr.demo@oia.gov.om','OiaHr#2026',['/hr/dashboard','/hr/presentation','/hr/cv-parsing','/hr/candidates','/hr/ai-matching','/hr/assessments','/hr/ai-interview','/hr/settings']],
 ['candidate.demo@example.com','OiaCand#2026',['/candidate','/candidate/profile','/candidate/jobs','/candidate/assessments','/candidate/interviews']],
];
for(const [email,password,paths] of accounts){
 const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
 const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;
 const key=`sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
 const encoded='base64-'+Buffer.from(JSON.stringify(data.session)).toString('base64url');
 const chunks=encoded.match(/.{1,3000}/g);
 const cookie=chunks.length===1?`${key}=${encoded}`:chunks.map((c,i)=>`${key}.${i}=${c}`).join('; ');
 for(const path of paths){
  const res=await fetch(base+path,{headers:{Cookie:cookie},redirect:'manual',signal:AbortSignal.timeout(120000)});
  const body=await res.text();
  assert.equal(res.status,200,`${path}: HTTP ${res.status}`);
  assert.ok(!body.includes('No QueryClient set')&&!body.includes('getServerSnapshot should be cached')&&!body.includes('NEXT_HTTP_ERROR_FALLBACK;500'),`${path}: rendering error`);
  console.log(`PASS ${path}: authenticated server render`);
 }
}
