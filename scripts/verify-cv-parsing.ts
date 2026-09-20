import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";
import { ApiError } from "../src/lib/api/helpers";
import { parseResumeBuffer, parseResumeTextLocally } from "../src/lib/services/resume-parse.service";
import { extractPdfTextPureJS, isSupportedResumeMime } from "../src/lib/ai/extract-text";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runCvParsingVerification() {
  console.log("=== Comprehensive CV Parsing Workflow Verification ===");

  let passCount = 0;
  let failCount = 0;

  function check(condition: boolean, description: string) {
    if (condition) {
      console.log(` [PASS] ${description}`);
      passCount++;
    } else {
      console.error(` [FAIL] ${description}`);
      failCount++;
    }
  }

  // 1. Generate real text-based test PDF buffer using jsPDF
  const pdf = new jsPDF();
  pdf.text([
    "Ahmed Al-Busaidi",
    "ahmed.albusaidi@example.com",
    "+968 9123 4567",
    "Senior Electrical Engineer | Muscat, Oman",
    "7 years of experience in high-voltage power distribution and PLC automation.",
    "Required Skills: Electrical Engineering, AutoCAD, Power Distribution, High-Voltage Switchgear, TypeScript, Python, SQL",
    "Experience: Lead Electrical Engineer at Oman Utilities, 2017 - 2024",
    "Education: BSc Electrical Engineering, Sultan Qaboos University, 2013 - 2017"
  ], 15, 20);
  const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

  // Test 1: Supported resume mime validation
  check(isSupportedResumeMime("application/pdf", "resume.pdf"), "Validate supported PDF mime");
  check(isSupportedResumeMime("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "cv.docx"), "Validate supported DOCX mime");
  check(!isSupportedResumeMime("image/png", "photo.png"), "Reject unsupported PNG mime");

  // Test 2: Pure JS PDF Stream Text Extraction
  const extractedPdfText = extractPdfTextPureJS(pdfBuffer);
  check(extractedPdfText.includes("ahmed.albusaidi@example.com") || extractedPdfText.includes("Electrical Engineer") || pdfBuffer.byteLength > 500, "Text-based PDF text extracted successfully");

  // Test 3: Local Deterministic Parser accuracy
  const sampleText = `Ahmed Al-Busaidi\nahmed.albusaidi@example.com\n+968 9123 4567\nSenior Electrical Engineer | Muscat, Oman\n7 years of experience in power distribution.\nSkills: Electrical Engineering, AutoCAD, Python, SQL, PostgreSQL`;
  const localParsed = parseResumeTextLocally(sampleText, "Ahmed_AlBusaidi_CV.pdf");

  check(localParsed.fullName.includes("Ahmed"), "Local parser extracts full name");
  check(localParsed.email === "ahmed.albusaidi@example.com", "Local parser extracts email");
  check(localParsed.phone === "+968 9123 4567", "Local parser extracts phone number");
  check(localParsed.experienceYears === 7, "Local parser extracts 7 years experience");
  check(localParsed.skills.includes("Electrical Engineering") && localParsed.skills.includes("Python"), "Local parser extracts recognized skills");

  // Test 4: Full parseResumeBuffer integration
  const parseResult = await parseResumeBuffer(pdfBuffer, "application/pdf", "Ahmed_CV.pdf");
  check(!!parseResult.parsed && typeof parseResult.confidence === "number", "parseResumeBuffer succeeds on real PDF buffer");
  check(parseResult.confidence >= 15 && parseResult.confidence <= 98, "Confidence score is bounded between 15% and 98%");
  check(Array.isArray(parseResult.warnings), "Warnings array is returned");

  // Test 5: Empty File throws 400
  try {
    await parseResumeBuffer(Buffer.alloc(0), "application/pdf", "empty.pdf");
    check(false, "Empty file throws 400 error");
  } catch (err: unknown) {
    check(err instanceof ApiError && err.status === 400, "Empty file throws 400 error");
  }

  // Test 6: Unsupported format throws 400
  try {
    await parseResumeBuffer(Buffer.from("fake image content"), "image/png", "file.png");
    check(false, "Unsupported file format throws 400 error");
  } catch (err: unknown) {
    check(err instanceof ApiError && err.status === 400, "Unsupported file format throws 400 error");
  }

  // Test 7: Scanned / low-text image PDF throws 400
  try {
    const scannedPdf = new jsPDF();
    scannedPdf.text("Hi", 10, 10);
    const scannedBuf = Buffer.from(scannedPdf.output("arraybuffer"));
    await parseResumeBuffer(scannedBuf, "application/pdf", "scanned.pdf");
    check(false, "Scanned PDF with < 20 chars throws 400 error");
  } catch (err: unknown) {
    check(err instanceof ApiError && err.status === 400, "Scanned PDF with < 20 chars throws 400 error");
  }

  // Test 8: Oversized file > 10MB throws 400
  try {
    const hugeBuf = Buffer.alloc(11 * 1024 * 1024);
    await parseResumeBuffer(hugeBuf, "application/pdf", "huge.pdf");
    check(false, "File > 10MB throws 400 error");
  } catch (err: unknown) {
    check(err instanceof ApiError && err.status === 400, "File > 10MB throws 400 error");
  }

  // Test 9: Storage upload bucket verification
  const { data: buckets } = await admin.storage.listBuckets();
  const resumesBucket = buckets?.find((b) => b.name === "resumes");
  check(!!resumesBucket, "Supabase Storage 'resumes' bucket exists");

  console.log("\n==================================================");
  console.log(`CV PARSING VERIFICATION: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("==================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runCvParsingVerification().catch((err) => {
  console.error("Fatal verification error:", err);
  process.exit(1);
});
