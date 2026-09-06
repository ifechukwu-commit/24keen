"use strict";(()=>{var e={};e.id=298,e.ids=[298],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7689:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>g,patchFetch:()=>y,requestAsyncStorage:()=>h,routeModule:()=>d,serverHooks:()=>m,staticGenerationAsyncStorage:()=>p});var n={};a.r(n),a.d(n,{POST:()=>u});var r=a(9303),o=a(8716),s=a(670),i=a(7070);let c=(0,a(7495).eI)(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY),l=`You are a senior smart contract security researcher with 20 years experience auditing DeFi protocols, bridges, and NFT contracts. Your job is to identify ATTACK SIGNALS — specific entry points and exploitable chains — not generic checklists.

For every signal you identify, you must provide:
1. The exact vulnerable code location
2. A realistic attack chain showing HOW an attacker exploits it step by step
3. What the attacker gains (funds drained, access gained, system broken)
4. What a human auditor should manually verify to confirm it is real
5. Your confidence that this is actually exploitable

Return a JSON array. Each item must have these exact fields:
- id: unique string
- severity: "critical" | "high" | "medium" | "low"
- category: one of these exact categories: "Access Control" | "IDOR/Authorization" | "Reentrancy" | "Business Logic" | "Accounting/Invariant" | "Oracle/Price Manipulation" | "Rounding/Precision" | "Signature/Replay" | "Token Integration" | "Unsafe External Call" | "Upgradeability" | "DeFi Economic Attack" | "DoS/Gas" | "Secrets/Key Exposure" | "Cross-Layer Chain"
- title: short precise title
- signal: what pattern in the code triggered this signal
- attackChain: step by step numbered list of exactly how an attacker exploits this
- evidence: the exact code lines that are vulnerable
- location: function name and approximate line
- impact: what the attacker gains — be specific about funds, access, or system damage
- humanVerification: exactly what a human auditor must check manually to confirm this is real before submitting
- confidence: "confirmed" | "probable" | "investigate"
- swc: SWC number string or null

Rules:
- Only flag cross-layer chains when the full exploitable chain actually exists in the code
- Do not flag theoretical issues without evidence in the actual code
- For accounting/invariant violations, show the exact invariant that breaks
- For reentrancy, show the exact call sequence
- For access control, show exactly who can call what they should not be able to call
- confidence "confirmed" means the code is definitely exploitable as written
- confidence "probable" means it is likely exploitable pending external context
- confidence "investigate" means it is worth a human look but not yet confirmed

Return ONLY valid JSON array. No markdown. No text outside the array.`;async function u(e){try{let{code:t,contractAddress:a,aiKey:n,jobId:r}=await e.json();if(!n)return i.NextResponse.json({error:"AI key required"},{status:400});if(!t&&!a)return i.NextResponse.json({error:"Provide code or contract address"},{status:400});let o=t,s="Unknown";if(a&&!t)try{let e=`https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${a}`,t=await fetch(e,{signal:AbortSignal.timeout(15e3)}),n=await t.json();if(!n.result?.[0]?.SourceCode)return i.NextResponse.json({error:"Contract source not found. Must be verified on Etherscan."},{status:400});o=n.result[0].SourceCode,s=n.result[0].ContractName||"Unknown"}catch(e){return i.NextResponse.json({error:"Etherscan fetch failed: "+e.message},{status:500})}if(!o?.trim())return i.NextResponse.json({error:"No contract code to analyze"},{status:400});r&&await c.from("keen_web3_jobs").update({status:"running",started_at:new Date().toISOString()}).eq("id",r);let u=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":n,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:8e3,temperature:0,system:l,messages:[{role:"user",content:`Analyze this smart contract. Identify every attack signal. For each one show the exact exploitable chain.

Contract: ${s}
Address: ${a||"not provided"}

Source Code:
${o.slice(0,1e5)}`}]}),signal:AbortSignal.timeout(12e4)});if(!u.ok){let e=await u.text();return r&&await c.from("keen_web3_jobs").update({status:"error",error:e}).eq("id",r),i.NextResponse.json({error:"AI error: "+e},{status:500})}let d=await u.json(),h=d.content?.[0]?.text??"[]",p=[];try{let e=h.replace(/```json|```/g,"").trim();p=JSON.parse(e),Array.isArray(p)||(p=[])}catch{p=[]}return r&&p.length>0?await c.from("keen_web3_jobs").update({status:"done",completed_at:new Date().toISOString(),signals_count:p.length,results:p}).eq("id",r):r&&await c.from("keen_web3_jobs").update({status:"done",completed_at:new Date().toISOString(),signals_count:0}).eq("id",r),i.NextResponse.json({ok:!0,signals:p,count:p.length,contractName:s})}catch(e){return i.NextResponse.json({error:e.message},{status:500})}}let d=new r.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/web3-scan/route",pathname:"/api/web3-scan",filename:"route",bundlePath:"app/api/web3-scan/route"},resolvedPagePath:"C:\\24keen-web\\app\\api\\web3-scan\\route.ts",nextConfigOutput:"",userland:n}),{requestAsyncStorage:h,staticGenerationAsyncStorage:p,serverHooks:m}=d,g="/api/web3-scan/route";function y(){return(0,s.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:p})}}};var t=require("../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),n=t.X(0,[276,972,495],()=>a(7689));module.exports=n})();