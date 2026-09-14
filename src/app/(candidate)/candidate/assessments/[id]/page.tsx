"use client";
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api/fetcher';
import { toast } from 'sonner';

type Question={id:string;prompt:string;question_type:string;options:unknown;points:number};
type Exam={assignment:{status:string;score:number|null;started_at:string|null};assessment:{title:string;description:string|null;duration_minutes:number};questions:Question[]};
export default function TakeAssessmentPage(){
 const {id}=useParams<{id:string}>();
 const url=`/api/assessments/assignments/${id}`;
 const query=useQuery({queryKey:['exam',id],queryFn:()=>apiFetch<Exam>(url),refetchOnWindowFocus:true});
 const [answers,setAnswers]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[now,setNow]=useState(()=>Date.now());
 const autoSubmitted=useRef(false);
 const data=query.data;
 const deadline=data?.assignment.started_at?new Date(data.assignment.started_at).getTime()+(data.assessment.duration_minutes*60000):null;
 const remaining=deadline?Math.max(0,Math.ceil((deadline-now)/1000)):null;
 const completed=data?.assignment.status==='completed';
 async function submit(){
  if(busy||completed)return;
  setBusy(true);
  try{const result=await apiFetch<{score:number}>(url,{method:'POST',body:JSON.stringify({action:'submit',answers})});toast.success(`Assessment submitted: ${result.score}%`);await query.refetch();}
  catch(e){toast.error(e instanceof Error?e.message:'Submission failed');await query.refetch();}
  finally{setBusy(false);}
 }
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{
  if(remaining===0&&!completed&&data?.assignment.status==='in_progress'&&!autoSubmitted.current){autoSubmitted.current=true;void submit();}
  // Submit the latest answers once when the server-defined time limit expires.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[remaining,completed]);
 if(query.isLoading)return <p className="glass-card p-6">Loading exam…</p>;
 if(query.isError)return <div className="glass-card p-6" role="alert">{query.error.message}<Button onClick={()=>query.refetch()}>Retry</Button></div>;
 if(!data)return null;
 return <div className="max-w-3xl space-y-5"><h1 className="text-xl font-semibold">{data.assessment.title}</h1><p className="text-sm text-muted-foreground">{data.assessment.description}</p>
 {completed?<div className="glass-card p-6"><h2 className="font-semibold">Exam completed</h2><p className="text-3xl mt-3">{data.assignment.score}%</p><p className="text-sm mt-2">Your result has been saved for HR review.</p></div>:!data.assignment.started_at?<div className="glass-card p-6 space-y-4"><p>You have {data.assessment.duration_minutes} minutes. The timer starts when you begin and continues if you leave this page. Submit all answers before the time limit.</p><Button disabled={busy} onClick={async()=>{setBusy(true);try{await apiFetch(url,{method:'POST',body:JSON.stringify({action:'start'})});await query.refetch();}catch(e){toast.error(e instanceof Error?e.message:'Could not start');}finally{setBusy(false);}}}>Start exam</Button></div>:<form className="space-y-4" onSubmit={e=>{e.preventDefault();void submit();}}>
 <div className="sticky top-0 glass-card p-4 z-10 flex justify-between"><span>Time remaining</span><strong role="timer">{Math.floor((remaining??0)/60)}:{String((remaining??0)%60).padStart(2,'0')}</strong></div>
 {data.questions.map((q,i)=><fieldset key={q.id} disabled={busy||remaining===0} className="glass-card p-5 space-y-3"><legend className="text-sm font-medium px-2">{i+1}. {q.prompt} ({q.points} points)</legend>{q.question_type==='multiple_choice'&&Array.isArray(q.options)?(q.options as string[]).map(opt=><label key={opt} className="flex items-center gap-3 text-sm"><input type="radio" name={q.id} checked={answers[q.id]===opt} onChange={()=>setAnswers(a=>({...a,[q.id]:opt}))}/>{opt}</label>):<textarea aria-label={`Answer to question ${i+1}`} maxLength={12000} rows={5} className="w-full bg-background border rounded-lg p-3" value={answers[q.id]??''} onChange={e=>setAnswers(a=>({...a,[q.id]:e.target.value}))}/>}</fieldset>)}
 <Button disabled={busy||!data.questions.length}>{busy?'Scoring submission…':data.assignment.status==='grading_failed'?'Retry grading saved answers':'Submit answers'}</Button><p className="text-xs text-muted-foreground">Unanswered questions receive zero points. Written answers are evaluated against the author’s rubric.</p>
 </form>}</div>;
}
