// Uses dedicated verification records and removes only IDs created by this run.
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import assert from 'node:assert/strict';
dotenv.config({path:'.env.local',quiet:true});
const base=process.argv[2]||'http://localhost:3001';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL, anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const stamp=Date.now(); const created={users:[],candidates:[],jobs:[],assessments:[],resumePaths:[]};
let assertions=0;
function check(condition,label){assert.ok(condition,label);assertions++;console.log('PASS '+label);}
async function checkServer() {
  try {
    await fetch(base, { method: "HEAD", signal: AbortSignal.timeout(3000) });
  } catch (_err) {
    console.error(`\n[Verification Warning] Target server at ${base} is not running or not responding.`);
    console.error(`Please launch the dev server first ('npm run dev') or pass target URL: node scripts/verify-readiness.mjs <url>\n`);
    process.exit(1);
  }
}
async function api(cookie,path,method='GET',body){
 const res=await fetch(base+path,{method,headers:{Cookie:cookie,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body),redirect:'manual'});
 const json=await res.json().catch(()=>({}));return {status:res.status,data:json.data,error:json.error};
}
async function account(role,candidateId=null){
 const email=`readiness-${role.toLowerCase().replace(/ /g,"-")}-${stamp}-${created.users.length}@example.com`,password=`Verify!${crypto.randomUUID()}`;
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});if(error)throw error;
 created.users.push(data.user.id);
 const {data:roles}=await admin.from('roles').select('id,organization_id').eq('name',role).limit(1);
 const r=roles[0];
 const {error:profileError}=await admin.from('profiles').update({status:'active',organization_id:r.organization_id,role_id:r.id,portal_role:role==='Super Admin'?'super_admin':role==='Candidate'?'candidate':'hr',candidate_id:candidateId}).eq('id',data.user.id);if(profileError)throw profileError;
 const client=createClient(url,anon,{auth:{persistSession:false}});
 const {data:auth,error:authError}=await client.auth.signInWithPassword({email,password});if(authError)throw authError;
 const name=`sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
 const value='base64-'+Buffer.from(JSON.stringify(auth.session)).toString('base64url');
 const chunks=value.match(/.{1,3000}/g);
 const cookie=chunks.length===1?`${name}=${value}`:chunks.map((c,i)=>`${name}.${i}=${c}`).join('; ');
 return {cookie,client,id:data.user.id,org:r.organization_id};
}
try{
 await checkServer();
 const hr=await account('Super Admin');
 const {data:departments}=await admin.from('departments').select('name').eq('organization_id',hr.org).limit(1);
 const job=await api(hr.cookie,'/api/jobs','POST',{title:`Readiness Software Engineer ${stamp}`,department:departments[0]?.name||'Engineering',location:'Muscat, Oman',type:'Full-time',level:'Senior',minExperience:5,description:'Develop reliable JavaScript and React applications backed by PostgreSQL. Design APIs, test software and review code.',requiredSkills:'JavaScript, React, PostgreSQL'});
 check(job.status===201||job.status===200,'Create job'); created.jobs.push(job.data.id);
 check((await api(hr.cookie,`/api/jobs/${job.data.id}`,'PATCH',{status:'Open'})).status===200,'Publish job');
 const pdf=new jsPDF();pdf.text(['Sam Verification','sam.verification@example.com','Software Engineer | Muscat, Oman','5 years professional experience','Skills: JavaScript, React, PostgreSQL','Experience: Software Engineer at Example Engineering, 2021 - 2026','Built React applications and PostgreSQL APIs with automated tests.','Education: BSc Computer Science, Example University, 2017 - 2021'],15,20);
 const form=new FormData();form.append('file',new Blob([pdf.output('arraybuffer')],{type:'application/pdf'}),'verification-resume.pdf');
 const parsed=await api(hr.cookie,'/api/candidates/parse-resume','POST',form);
 check(parsed.status===200,'Parse real PDF through configured AI'); created.resumePaths.push(parsed.data.resumeFilePath);
 check(parsed.data.email==='sam.verification@example.com','Extract factual resume email');
 check(parsed.data.skills.some(s=>/javascript/i.test(s)),'Extract resume skills');
 const candidate=await api(hr.cookie,'/api/candidates','POST',{...parsed.data,email:`verification-${stamp}@example.com`,fullName:parsed.data.fullName,experienceYears:5,jobId:job.data.id});
 check(candidate.status===201||candidate.status===200,'Create structured candidate profile');created.candidates.push(candidate.data.id);
 const appId=candidate.data.applicationId;
 const candidateUser=await account('Candidate',candidate.data.id);
 const otherCandidate=await admin.from('candidates').insert({organization_id:hr.org,full_name:'Other Verification',email:`other-${stamp}@example.com`}).select('id').single();if(otherCandidate.error)throw otherCandidate.error;created.candidates.push(otherCandidate.data.id);
 const other=await account('Candidate',otherCandidate.data.id);
 const matches=await api(hr.cookie,`/api/jobs/${job.data.id}/matches`);
 check(matches.status===200,'Semantic matching returns results');
 const match=matches.data.matches.find(m=>m.id===candidate.data.id);
 check(match&&match.matchScore>=0&&match.matchScore<=100,'Percentage match is bounded and candidate-specific');
 const evaluation=await api(hr.cookie,`/api/applications/${appId}/evaluation`,'POST');
 check(evaluation.status===200,'Persist application reasoning and recommendation');
 const exam=await api(hr.cookie,'/api/assessments','POST',{title:`Readiness exam ${stamp}`,durationMinutes:10,questions:[{prompt:'Which language runs in web browsers?',questionType:'multiple_choice',options:['JavaScript','SQL'],correctAnswer:'JavaScript',points:2},{prompt:'Which database is relational?',questionType:'multiple_choice',options:['PostgreSQL','CSS'],correctAnswer:'PostgreSQL',points:1}]});
 check(exam.status===201,'Create exam with validated questions');created.assessments.push(exam.data.id);
 const assignment=await api(hr.cookie,'/api/assessments/assignments','POST',{assessmentId:exam.data.id,applicationId:appId});check(assignment.status===201,'Assign exam to candidate application');
 const examUrl=`/api/candidate/assessments/${assignment.data.id}`;
 check((await api(other.cookie,examUrl)).status===403||(await api(other.cookie,examUrl)).status===404,'Reject another candidate reading an exam');
 check((await candidateUser.client.from('assessment_questions').select('*').eq('assessment_id',exam.data.id)).data?.length===0,'Block direct database answer-key access');
 const startRes=await api(candidateUser.cookie,examUrl,'POST',{action:'start'});
 if (startRes.status !== 200) console.log('START_RES_DIAGNOSTIC:', startRes);
 check(startRes.status===200,'Start server-timed exam');
 const started=await api(candidateUser.cookie,examUrl);
 check(started.data.questions.every(q=>!('correct_answer' in q)),'Never expose answer keys in exam response');
 const answers=Object.fromEntries(started.data.questions.map(q=>[q.id,q.options[0]]));
 const submitted=await api(candidateUser.cookie,examUrl,'POST',{answers});check(submitted.data?.score===100,'Grade correct answers at 100 percent');
 const again=await api(candidateUser.cookie,examUrl,'POST',{answers:{}});check(again.data?.score===100,'Completed exam cannot be rescored by resubmission');
 const tamper=await candidateUser.client.from('assessment_assignments').update({score:1}).eq('id',assignment.data.id).select('id');check(!!tamper.error||!tamper.data?.length,'Block direct score tampering');
 const interview=await api(candidateUser.cookie,'/api/interviews','POST',{candidateId:candidate.data.id,applicationId:appId,mode:'technical'});check(interview.status===201,'Start candidate interview linked to application');
 const interviewUrl=`/api/interviews/${interview.data.id}`;
 check((await api(other.cookie,interviewUrl)).status===404,'Block another candidate reading interview');
 check((await api(candidateUser.cookie,interviewUrl,'POST',{action:'finalize'})).status===400,'Prevent scoring empty interview');
 for(const content of ['I built a React dashboard backed by PostgreSQL and JavaScript APIs. I owned the integration and wrote regression tests for key workflows.','I used parameterized SQL, scoped every query by organization, and reviewed row-level permissions. I added tests proving a user cannot read another organization’s records.','I measured query latency, added targeted indexes, and reduced repeated requests. I validated improvements with production-like workloads and code reviews.']){
   const reply=await api(candidateUser.cookie,interviewUrl,'POST',{action:'message',content});check(reply.status===200&&reply.data.reply?.length>0,'AI interviewer responds to candidate evidence');
 }
 const streamRes=await fetch(base+interviewUrl+'/stream',{method:'POST',headers:{Cookie:candidateUser.cookie,'Content-Type':'application/json'},body:JSON.stringify({content:'I use unit and integration tests to cover permission boundaries and edge cases. A release is approved only after critical workflows pass and a reviewer checks the results.'})});
 const streamed=await streamRes.text();
 check(streamRes.status===200&&streamed.includes('event: delta')&&streamed.includes('event: done')&&!streamed.includes('event: error'),'Stream an AI answer and persist the transcript');
 const finished=await api(candidateUser.cookie,interviewUrl,'POST',{action:'finalize'});check(finished.status===200&&finished.data.evaluation.scores.overall>=0&&finished.data.evaluation.scores.overall<=100,'Finalize interview with validated scoring');
 check((await api(candidateUser.cookie,interviewUrl,'POST',{action:'message',content:'Change my score'})).status===409,'Prevent changes after interview completion');
 const summary=await api(hr.cookie,`/api/applications/${appId}/evaluation`);check(summary.data.complete&&summary.data.assessmentCount===1&&summary.data.interviewCount===1,'Composite score uses completed exam and interview evidence');
 const cross=await candidateUser.client.from('candidates').select('id').eq('id',otherCandidate.data.id);check(cross.data?.length===0,'Candidate data isolation at database level');
 const escalation=await candidateUser.client.from('profiles').update({portal_role:'super_admin'}).eq('id',candidateUser.id);check(!!escalation.error,'Block self-service privilege escalation');
 await admin.from('profiles').update({status:'suspended'}).eq('id',candidateUser.id);
 check((await api(candidateUser.cookie,'/api/me')).status===403,'Suspended account cannot call protected API');
 console.log(`SUCCESS: ${assertions} live assertions passed`);
 const signup=await admin.auth.admin.createUser({email:'signup-verification-'+stamp+'@example.com',password:'Verify!'+crypto.randomUUID(),email_confirm:true,user_metadata:{portal_role:'candidate',full_name:'Signup Verification'}});
 if(signup.error)throw signup.error;created.users.push(signup.data.user.id);
 const {data:provisioned}=await admin.from('profiles').select('candidate_id,portal_role,status').eq('id',signup.data.user.id).single();
 if(provisioned?.candidate_id)created.candidates.push(provisioned.candidate_id);
 check(provisioned?.portal_role==='candidate'&&provisioned.status==='active'&&!!provisioned.candidate_id,'Signup trigger provisions an active linked candidate');
 console.log('FINAL: '+assertions+' live assertions passed');
} finally {
 if(created.resumePaths.length) await admin.storage.from('resumes').remove(created.resumePaths);
 for(const id of created.assessments) await admin.from('assessments').delete().eq('id',id);
 for(const id of created.users) await admin.auth.admin.deleteUser(id);
 for(const id of created.candidates) await admin.from('candidates').delete().eq('id',id);
 for(const id of created.jobs) await admin.from('jobs').delete().eq('id',id);
 console.log('Removed verification records created by this run');
}

