import os
import sys
import csv
import time
from groq import Groq

# Force UTF-8 output encoding for emojis on Windows terminals
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

# Retrieve API Key from Environment
api_key = os.environ.get("GROQ_API_KEY", "")
client = Groq(api_key=api_key)

# 10 categories targeted for synthetic LLM generation (skips are created locally in prepare_dataset.py)
CATEGORIES = {
    "math": {
        "technique": "self-consistency",
        "secondary_technique": "cot",
        "description": "arithmetic, algebra, geometry, probability, percentages, word problems, calculus, statistics",
        "examples": [
            "solve 3x + 7 = 22",
            "what is compound interest if i invest 10000 at 8% for 5 years",
            "how many ways can i arrange 4 books on a shelf",
            "find the area of a circle with radius 7",
            "if train travels 60kmph for 2.5 hours how far does it go"
        ]
    },
    "code": {
        "technique": "pot",
        "secondary_technique": "react",
        "description": "writing functions, debugging, implementing algorithms, explaining code, code review, SQL, APIs, React components",
        "examples": [
            "write a python function to reverse a string",
            "why is my for loop running infinitely",
            "how to fetch data from an api in javascript",
            "write sql query to get top 5 customers by revenue",
            "create a react component for a dropdown with search"
        ]
    },
    "creative": {
        "technique": "role-prompting",
        "secondary_technique": "tree-of-thoughts",
        "description": "writing stories, poems, blog posts, scripts, marketing copy, social media captions, song lyrics, emails",
        "examples": [
            "write a short story about a robot who learns to feel emotions",
            "write a poem about monsoon in bangalore",
            "draft an instagram caption for my cafe launch",
            "write a cover letter for a software developer job",
            "create a youtube script intro for my tech channel"
        ]
    },
    "factual": {
        "technique": "step-back",
        "secondary_technique": "cot",
        "description": "explanations, definitions, history, technology descriptions, science, cause and effect",
        "examples": [
            "what is blockchain",
            "how does the immune system work",
            "difference between machine learning and deep learning",
            "why does the sky appear blue",
            "explain how gst works in india"
        ]
    },
    "planning": {
        "technique": "least-to-most",
        "secondary_technique": "tree-of-thoughts",
        "description": "project timelines, study schedules, learning roadmaps, itineraries, schedules, business strategy",
        "examples": [
            "how do i start learning data science from scratch",
            "create a 30 day plan to learn react",
            "plan my startup launch strategy",
            "how to prepare for a software developer interview in 2 months",
            "create a weekly schedule for a freelancer"
        ]
    },
    "analysis": {
        "technique": "self-refine",
        "secondary_technique": "meta-prompting",
        "description": "pros and cons, reviews, comparison, feedback, critiques, swot, resume audits",
        "examples": [
            "analyze the pros and cons of working remotely",
            "compare mongodb vs postgresql for a startup",
            "should i use react or vue for my project",
            "review my business idea for an ai tutoring app",
            "what are the risks of investing in crypto"
        ]
    },
    "longform": {
        "technique": "skeleton",
        "secondary_technique": "prompt-chaining",
        "description": "comprehensive guides, detailed reports, in-depth explanations, full documentation, research summaries, essays",
        "examples": [
            "write a comprehensive guide to prompt engineering",
            "create a full technical documentation for a rest api",
            "write a detailed report on electric vehicles in india",
            "give me an in-depth explanation of how transformers work in ai",
            "write a complete beginner guide to investing in stocks"
        ]
    },
    "conversational": {
        "technique": "instruction-prompting",
        "secondary_technique": "role-prompting",
        "description": "casual advice, small talk, book recommendations, venting, personal choices, entertainment",
        "examples": [
            "what should i watch on netflix tonight",
            "suggest me some good restaurants in bangalore",
            "i am feeling burnt out what should i do",
            "which laptop should i buy under 60000",
            "help me decide between two job offers"
        ]
    },
    "agentic": {
        "technique": "react",
        "secondary_technique": "prompt-chaining",
        "description": "real-time web search, browser lookup, API actions, multi-step online research, data scraping, tool use",
        "examples": [
            "search the web and find the latest news on openai",
            "look up the current price of ethereum and tell me if i should buy",
            "find recent papers on RAG published in the last 3 months",
            "browse linkedin and find ai engineer jobs in bangalore",
            "find the top 5 competitors of my startup idea and summarize them"
        ]
    },
    "structured_output": {
        "technique": "xml-structured",
        "secondary_technique": "instruction-prompting",
        "description": "JSON responses, database schemas, markdown tables, CSV files, configuration setups, data model structure",
        "examples": [
            "give me a json object for a user profile with name email and age",
            "create a database schema for an ecommerce app in sql",
            "output this data as a markdown table",
            "design the json response structure for a REST API for a todo app",
            "give me a yaml config file for a docker setup"
        ]
    }
}

BATCH_SIZE = 50
BATCHES_PER_CATEGORY = 14  # 14 * 50 = 700 examples per category

def generate_batch(category, config, batch_num):
    examples_str = "\n".join([f'- "{e}"' for e in config["examples"]])
    
    prompt = f"""You are a world-class prompt engineer with 20 years of experience, specialized in designing, optimizing, and evaluating premium prompts for LLMs (like GPT-4o, Claude 3.5 Sonnet, and Gemini Pro).

Generate exactly {BATCH_SIZE} unique CSV rows for the category: {category.upper()}

Category covers: {config["description"]}

Output ONLY raw CSV rows. No header. No explanation. No numbering. Nothing else.

Format of each row MUST match the V2 balanced CSV columns:
"prompt",label,technique,secondary_technique,complexity,model_target,source,platform_context,prompt_length_bucket,ambiguity_flag,language_style,dataset_version

Rules for values:
- prompt: in double quotes. Natural, messy, real user prompts. Mix of casual, formal, short, long, typos, indian english, beginner phrasing, expert phrasing. NO duplicate prompts.
- label: always {category}
- technique: always {config["technique"]}
- secondary_technique: always {config["secondary_technique"]}
- complexity: simple OR medium OR complex
- model_target: always standard
- source: always generated
- platform_context: randomly assign chatgpt / claude / gemini
- prompt_length_bucket: short (<=15 words) OR medium (15 to 50 words) OR long (>50 words)
- ambiguity_flag: 0 or 1
- language_style: casual OR technical OR indian_english OR formal
- dataset_version: always v1

Style variety required (mix all of these):
- Very short prompts: "explain neural networks"
- Casual with typos: "hw to make website responsive"
- Indian English: "kindly explain what is pointer in c language"
- Detailed prompts: "I have a dataset with 10000 rows and need to find correlation between columns"
- Question format: "what happens when you divide by zero in python"
- Command format: "write me a function that checks palindrome"

Examples of the KIND of prompts I want (do not copy these, generate new ones):
{examples_str}

This is batch {batch_num} of {BATCHES_PER_CATEGORY}. Generate completely different prompts from previous batches.
Generate exactly {BATCH_SIZE} rows now:"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=4000,
        temperature=0.9  # High temp = more variety
    )
    
    return response.choices[0].message.content.strip()

def parse_rows(raw_text):
    rows = []
    for line in raw_text.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        try:
            parsed = next(csv.reader([line]))
            # Matches our 12 V2 columns
            if len(parsed) == 12:
                rows.append(parsed)
        except Exception:
            continue
    return rows

def get_existing_progress():
    output_file = "promptsmith_dataset.csv"
    progress = {}
    if not os.path.exists(output_file) or os.path.getsize(output_file) == 0:
        return progress
        
    try:
        with open(output_file, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            header = next(reader, None)
            if not header:
                return progress
            
            for row in reader:
                if len(row) >= 2:
                    prompt, label = row[0], row[1]
                    if label not in progress:
                        progress[label] = []
                    progress[label].append(prompt)
    except Exception as e:
        print(f"⚠️ Error reading existing dataset: {e}. Starting fresh.", flush=True)
    return progress

def generate_dataset():
    output_file = "promptsmith_dataset.csv"
    
    # Check existing progress
    existing_progress = get_existing_progress()
    file_exists = os.path.exists(output_file) and os.path.getsize(output_file) > 0
    
    mode = "a" if file_exists else "w"
    
    with open(output_file, mode, newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        
        if not file_exists:
            writer.writerow([
                "prompt", "label", "technique", "secondary_technique", "complexity", 
                "model_target", "source", "platform_context", "prompt_length_bucket", 
                "ambiguity_flag", "language_style", "dataset_version"
            ])
            print("📝 Starting a fresh dataset generation with V2 columns.", flush=True)
        else:
            print("🔄 Found existing dataset. Resuming progress...", flush=True)
            for cat, prompts in existing_progress.items():
                print(f"  - {cat.upper()}: {len(prompts)} rows already generated", flush=True)
        
        total_written = sum(len(prompts) for prompts in existing_progress.values())
        
        for category, config in CATEGORIES.items():
            existing_prompts = existing_progress.get(category, [])
            already_generated_count = len(existing_prompts)
            
            target_rows = BATCH_SIZE * BATCHES_PER_CATEGORY
            if already_generated_count >= target_rows:
                print(f"✅ {category.upper()} already fully generated ({already_generated_count} rows). Skipping.", flush=True)
                continue
                
            # Determine start batch based on already_generated_count
            start_batch = (already_generated_count // BATCH_SIZE) + 1
            
            print(f"\n{'='*50}", flush=True)
            print(f"Generating: {category.upper()} (resuming from batch {start_batch}/{BATCHES_PER_CATEGORY})", flush=True)
            print(f"{'='*50}", flush=True)
            
            category_count = already_generated_count
            
            for batch_num in range(start_batch, BATCHES_PER_CATEGORY + 1):
                print(f"  Batch {batch_num}/{BATCHES_PER_CATEGORY}...", end=" ", flush=True)
                
                max_retries = 4
                success = False
                
                for attempt in range(1, max_retries + 1):
                    try:
                        raw = generate_batch(category, config, batch_num)
                        rows = parse_rows(raw)
                        
                        if len(rows) == 0:
                            raise ValueError("Received 0 valid parsed rows from API response.")
                            
                        for row in rows:
                            writer.writerow(row)
                            category_count += 1
                            total_written += 1
                        
                        print(f"got {len(rows)} rows | category total: {category_count}", flush=True)
                        f.flush()
                        success = True
                        
                        # Throttle between successful batches
                        time.sleep(3.0)  
                        break
                        
                    except Exception as e:
                        print(f"\n⚠️ Attempt {attempt}/{max_retries} failed: {e}", flush=True)
                        if attempt < max_retries:
                            # Pause for token reset (45s, 60s, 90s)
                            sleep_time = 45 if attempt == 1 else (60 if attempt == 2 else 90)
                            print(f"🕒 Rate limit / API window hit. Sleeping for {sleep_time} seconds before retry...", flush=True)
                            time.sleep(sleep_time)
                        else:
                            print(f"❌ Batch {batch_num} failed completely after {max_retries} attempts. Skipping to next batch to prevent hang.", flush=True)
            
            print(f"  DONE: {category} = {category_count} rows", flush=True)
        
        print(f"\n{'='*50}", flush=True)
        print(f"DATASET COMPLETE", flush=True)
        print(f"Total rows in dataset: {total_written}", flush=True)
        print(f"File: {output_file}", flush=True)
        print(f"{'='*50}", flush=True)

def verify_dataset():
    try:
        import pandas as pd
    except ImportError:
        print("\nPandas is not installed. Skipping verification block.")
        return

    df = pd.read_csv("promptsmith_dataset.csv")
    print("\nDataset Summary:")
    print(df['label'].value_counts())
    print(f"\nTotal rows: {len(df)}")
    print(f"Duplicate prompts: {df['prompt'].duplicated().sum()}")
    
    # Remove duplicates
    df = df.drop_duplicates(subset=["prompt"])
    df.to_csv("promptsmith_dataset_clean.csv", index=False)
    print(f"After dedup: {len(df)} rows")
    print("Saved to: promptsmith_dataset_clean.csv")

if __name__ == "__main__":
    generate_dataset()
    verify_dataset()
