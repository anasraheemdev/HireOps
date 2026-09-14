"use client";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api/fetcher';
import { useCandidatesQuery } from '@/lib/queries/use-candidates';
import { toast } from 'sonner';

type Assessment={id:string;title:string;description:string|null;question_count:number;duration_minutes:number;status:string};
type Question={prompt:string;questionType:'multiple_choice'|'free_text';options:string[];correctAnswer:string;points:number};
const blank=():Question=>({prompt:'',questionType:'multiple_choice',options:['',''],correctAnswer:'',points:1});
export default function AssessmentsPage(){
 const qc=useQueryClient();
 const [open,setOpen]=useState(false),[title,setTitle]=useState(''),[description,setDescription]=useState('');
 const [duration,setDuration]=useState(30),[questions,setQuestions]=useState<Question[]>([blank()]);
 const [assign,setAssign]=useState<string|null>(null),[applicationId,setApplicationId]=useState('');
 const query=useQuery({queryKey:['assessments'],queryFn:()=>apiFetch<Assessment[]>('/api/assessments')});
 const candidates=useCandidatesQuery();
 const create=useMutation({mutationFn:()=>apiFetch('/api/assessments',{method:'POST',body:JSON.stringify({title,description,durationMinutes:duration,questions})}),onSuccess:()=>{qc.invalidateQueries({queryKey:['assessments']});setOpen(false);setTitle('');setDescription('');setQuestions([blank()]);toast.success('Assessment and questions saved');},onError:(e:Error)=>toast.error(e.message)});
 const launch=useMutation({mutationFn:()=>apiFetch('/api/assessments/assignments',{method:'POST',body:JSON.stringify({assessmentId:assign,applicationId})}),onSuccess:()=>{setAssign(null);setApplicationId('');toast.success('Assessment assigned — available in the candidate portal');},onError:(e:Error)=>toast.error(e.message)});
 function patch(index:number,value:Partial<Question>){setQuestions(rows=>rows.map((q,i)=>i===index?{...q,...value}:q));}
 return <div className="max-w-6xl space-y-5">
 <div className="flex items-center justify-between"><div><h1 className="text-xl font-semibold">Assessment exams</h1><p className="text-sm text-muted-foreground">Author questions, assign candidates, and score submitted answers.</p></div><Button onClick={()=>setOpen(true)}>New assessment</Button></div>
 {query.isLoading&&<p>Loading assessments…</p>}{query.isError&&<p role="alert">{query.error.message}<Button onClick={()=>query.refetch()}>Retry</Button></p>}
 {query.data?.length===0&&<p className="glass-card p-6">No exams yet. Create an assessment with questions to begin.</p>}
 {query.data?.map(a=><div key={a.id} className="glass-card p-5 flex gap-4 items-center"><div className="flex-1"><h2 className="font-semibold">{a.title}</h2><p className="text-sm text-muted-foreground">{a.description}</p><p className="text-xs mt-2">{a.question_count} questions · {a.duration_minutes} minutes · {a.status}</p></div><Button disabled={!a.question_count||a.status!=='active'} onClick={()=>setAssign(a.id)}>Assign candidate</Button></div>)}
 <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Create assessment exam</DialogTitle></DialogHeader>
 <form className="space-y-5" onSubmit={e=>{e.preventDefault();create.mutate();}}>
 <div className="space-y-2"><Label htmlFor="exam-title">Title</Label><Input id="exam-title" required minLength={3} value={title} onChange={e=>setTitle(e.target.value)}/></div>
 <div className="space-y-2"><Label htmlFor="exam-description">Instructions</Label><Textarea id="exam-description" value={description} onChange={e=>setDescription(e.target.value)}/></div>
 <div className="space-y-2"><Label htmlFor="exam-duration">Time limit (minutes)</Label><Input id="exam-duration" type="number" required min={1} max={180} value={duration} onChange={e=>setDuration(Number(e.target.value))}/></div>
 {questions.map((q,i)=><fieldset key={i} className="border border-white/10 rounded-xl p-4 space-y-3"><legend className="px-2 text-sm">Question {i+1}</legend>
 <Label htmlFor={`prompt-${i}`}>Question text</Label><Textarea id={`prompt-${i}`} required minLength={5} value={q.prompt} onChange={e=>patch(i,{prompt:e.target.value})}/>
 <div className="grid grid-cols-2 gap-3"><label className="text-sm">Answer type<select className="block w-full bg-background border rounded-md p-2 mt-1" value={q.questionType} onChange={e=>patch(i,{questionType:e.target.value as Question['questionType'],correctAnswer:''})}><option value="multiple_choice">Multiple choice</option><option value="free_text">Written answer</option></select></label><label className="text-sm">Points<Input type="number" required min={1} max={100} value={q.points} onChange={e=>patch(i,{points:Number(e.target.value)})}/></label></div>
 {q.questionType==='multiple_choice'&&<><p className="text-xs text-muted-foreground">Enter each option, then select the correct answer.</p>{q.options.map((opt,j)=><label key={j} className="flex items-center gap-2"><input type="radio" name={`correct-${i}`} required checked={!!opt&&q.correctAnswer===opt} onChange={()=>patch(i,{correctAnswer:opt})} aria-label={`Option ${j+1} is correct`}/><Input required aria-label={`Option ${j+1}`} value={opt} onChange={e=>patch(i,{options:q.options.map((o,k)=>k===j?e.target.value:o),correctAnswer:q.correctAnswer===opt?e.target.value:q.correctAnswer})}/></label>)}<Button type="button" variant="outline" disabled={q.options.length>=8} onClick={()=>patch(i,{options:[...q.options,'']})}>Add option</Button></>}
 {q.questionType==='free_text'&&<><Label htmlFor={`rubric-${i}`}>Expected answer and grading rubric</Label><Textarea id={`rubric-${i}`} required value={q.correctAnswer} onChange={e=>patch(i,{correctAnswer:e.target.value})}/></>}
 <Button type="button" variant="ghost" disabled={questions.length===1} onClick={()=>setQuestions(rows=>rows.filter((_,n)=>n!==i))}>Remove question</Button>
 </fieldset>)}
 <div className="flex justify-between"><Button type="button" variant="outline" disabled={questions.length>=50} onClick={()=>setQuestions(rows=>[...rows,blank()])}>Add question</Button><Button disabled={create.isPending}>{create.isPending?'Saving…':'Save exam'}</Button></div>
 </form></DialogContent></Dialog>
 <Dialog open={!!assign} onOpenChange={v=>{if(!v)setAssign(null);}}><DialogContent><DialogHeader><DialogTitle>Assign assessment</DialogTitle></DialogHeader><label className="text-sm">Candidate application<select className="block w-full p-2 mt-2 bg-background border rounded-md" value={applicationId} onChange={e=>setApplicationId(e.target.value)}><option value="">Select an application</option>{candidates.data?.filter(c=>c.applicationId).map(c=><option key={c.applicationId} value={c.applicationId}>{c.name} — {c.appliedFor}</option>)}</select></label><Button disabled={!applicationId||launch.isPending} onClick={()=>launch.mutate()}>{launch.isPending?'Assigning…':'Assign exam'}</Button></DialogContent></Dialog>
 </div>;
}
