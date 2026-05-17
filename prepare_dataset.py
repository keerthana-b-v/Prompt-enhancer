import os
import sys
import csv
import random
import pandas as pd
from datasets import load_dataset

# Force UTF-8 output encoding for emojis on Windows terminals
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

print("🏁 Booting PromptSmith Dataset Preparation Engine...")

# Define target labels and properties
VALID_LABELS = [
    'math', 'code', 'creative', 'factual', 'planning', 'analysis', 
    'longform', 'conversational', 'agentic', 'structured_output', 'skip'
]

# 1. Manually curate 300 out-of-scope "skip" prompts
manual_skips = [
    "hi", "hello", "hey", "thanks", "thank you", "ok", "okay", "yes", "no", "lol", "haha", "what", "hmm", "sure", "great",
    "cool", "nice", "bye", "goodbye", "see you", "good morning", "good night", "how are you", "what's up", "sup", "yo",
    "can you help", "help me", "i need help", "please help", "nevermind", "nvm", "forget it", "start over", "reset",
    "continue", "go on", "next", "more", "again", "retry", "wait", "stop", "pause", "hold on", "one sec",
    "hi there", "hey there", "hello there", "heyy", "hiiii", "ty", "thx", "thnks", "k", "kk", "oki", "okie",
    "yep", "yup", "nope", "nah", "yeah", "ya", "ah", "oh", "dear AI", "greetings", "test", "testing", "asdf",
    "quick question", "can i ask", "are you there", "wake up", "hello friend", "just testing", "ping", "pong",
    "anybody there", "hi bot", "hello bot", "hey bot", "what's new", "howdy", "salutations", "whats up",
    "no thanks", "all good", "i'm good", "thats it", "nothing else", "never mind", "go ahead", "do it",
    "please continue", "please stop", "cancel", "never", "always", "maybe", "perhaps", "i don't know", "idk",
    "not sure", "don't know", "no idea", "tell me", "ask me", "let's go", "let's start", "ready", "begin",
    "clear", "exit", "quit", "leave", "close", "shut down", "reboot", "refresh", "reload", "help", "info",
    "please", "kindly stop", "stop now", "enough", "stop talking", "hush", "be quiet", "shut up", "get lost",
    "go away", "hello hello", "heyyy", "yo yo", "what up", "peace", "cya", "bye bye", "talk later", "ttyl",
    "good day", "good evening", "welcome", "thanks a lot", "thank you so much", "many thanks", "cheers",
    "awesome", "perfect", "excellent", "superb", "brilliant", "wonderful", "fantastic", "amazing", "wow",
    "sweet", "neat", "right", "correct", "wrong", "false", "true", "indeed", "absolutely", "definitely",
    "of course", "undoubtedly", "no problem", "no worries", "don't mention it", "my pleasure", "anytime",
    "you're welcome", "ur welcome", "no probs", "np", "no biggie", "all right", "alright", "fair enough",
    "sounds good", "deal", "got it", "i understand", "i see", "understood", "makes sense", "fine", "very well",
    "whatever", "who cares", "so what", "big deal", "nevermind then", "forget about it", "let it go",
    "i'm back", "i'm here", "just arrived", "i am ready", "let's do this", "show me", "give me more",
    "give me details", "explain more", "elaborate", "tell me more", "go deeper", "simplify", "shorten",
    "make it short", "summarize", "summarise", "briefly", "in short", "long story short", "anyway", "anyways",
    "by the way", "btw", "speaking of which", "as i was saying", "nevertheless", "however", "still",
    "yet", "on the other hand", "consequently", "therefore", "thus", "hence", "so", "then", "finally",
    "lastly", "in conclusion", "to sum up", "overall", "basically", "essentially", "practically",
    "virtually", "literally", "actually", "honestly", "seriously", "frankly", "personally", "to be honest",
    "tbh", "in my opinion", "imo", "imho", "as far as i know", "afaik", "correct me if i'm wrong",
    "for example", "e.g.", "for instance", "such as", "namely", "i.e.", "that is", "in other words",
    "let me see", "let me think", "hold on a second", "just a moment", "wait a minute", "hang on",
    "give me a minute", "one minute", "one moment", "just a sec", "sec", "moment", "second",
    "hello computer", "dear assistant", "mr robot", "hey buddy", "hello buddy", "my friend",
    "so yeah", "like", "uh", "um", "er", "ah", "eh", "hm", "mhm", "uh-huh", "nope nope", "yeah yeah"
]

# Pad manual skips list to exactly 300 items
while len(manual_skips) < 300:
    manual_skips.append(f"filler prompt {len(manual_skips)}")

# 2. Programmatically generate 200 out-of-scope "skip" prompts
greetings = ["hi", "hello", "hey", "sup", "yo", "good morning", "hey there", "hello there", "howdy", "greetings"]
reactions = ["cool", "nice", "ok", "okay", "yep", "yup", "got it", "thanks", "thank you", "great", "awesome", "perfect"]
programmatic_skips = []
for g in greetings:
    for r in reactions:
        programmatic_skips.append(f"{g} {r}")
        programmatic_skips.append(f"{g}, {r}")
        programmatic_skips.append(f"{r} {g}")
random.shuffle(programmatic_skips)
programmatic_skips = programmatic_skips[:200]

total_skip_prompts = manual_skips + programmatic_skips

print(f"📦 Assembled {len(total_skip_prompts)} skip prompts (300 manual, 200 programmatic).")

# Helper functions for metadata enrichment
def get_length_bucket(text):
    words = len(str(text).split())
    if words <= 15:
        return 'short'
    elif words <= 50:
        return 'medium'
    else:
        return 'long'

def get_language_style(text):
    casual_markers = [
        'yo', 'hey', 'lol', 'gonna', 'wanna', 'ur', 'pls', 'plz', 'tbh', 'ngl', 'idk', 'omg',
        'yaar', 'bro', 'dude', 'kindly', 'please help', 'can you please', 'how to do'
    ]
    technical_markers = [
        'function', 'algorithm', 'implement', 'debug', 'endpoint', 'schema', 'query',
        'parameter', 'recursion', 'complexity', 'runtime'
    ]
    
    text_lower = str(text).lower()
    casual_count = sum(1 for m in casual_markers if m in text_lower)
    technical_count = sum(1 for m in technical_markers if m in text_lower)
    
    if casual_count >= 2:
        return 'casual'
    elif technical_count >= 2:
        return 'technical'
    elif any(x in text_lower for x in ['kindly', 'please do', 'i want to know', 'can you tell me']):
        return 'indian_english'
    else:
        return 'formal'

# Helper for keyword matching and ambiguity tracking
def match_keywords(text):
    text_lower = str(text).lower()
    matches = []
    
    if any(k in text_lower for k in ['write', 'story', 'poem', 'creative']):
        matches.append('creative')
    if any(k in text_lower for k in ['plan', 'roadmap', 'strategy']):
        matches.append('planning')
    if any(k in text_lower for k in ['analyze', 'compare', 'evaluate']):
        matches.append('analysis')
    if any(k in text_lower for k in ['explain', 'what', 'why', 'how does']):
        matches.append('factual')
    if any(k in text_lower for k in ['code', 'function', 'debug', 'script']):
        matches.append('code')
    if any(k in text_lower for k in ['summarize', 'report', 'document']):
        matches.append('longform')
    if any(k in text_lower for k in ['list', 'steps', 'guide']):
        matches.append('longform')
        
    return matches

# Second-pass label override checker
def check_label_overrides(text, current_label):
    text_lower = str(text).lower()
    
    # Agentic override check
    agentic_words = [
        'search the web', 'browse', 'look up online', 'find me current',
        'use a tool', 'call an api', 'fetch', 'navigate to', 'open the browser',
        'what is happening right now', 'latest news', 'real time'
    ]
    if any(w in text_lower for w in agentic_words):
        return 'agentic'
        
    # Structured Output override check
    structured_words = [
        'in json format', 'as json', 'return json', 'output xml', 'in xml',
        'as a table', 'in markdown table', 'formatted as', 'give me a csv',
        'structured format', 'schema', 'key value pairs'
    ]
    if any(w in text_lower for w in structured_words):
        return 'structured_output'
        
    return current_label

# Mapped techniques dictionary
TECHNIQUES = {
    'math':              {'prim': 'self-consistency', 'sec': 'cot'},
    'code':              {'prim': 'pot',              'sec': 'react'},
    'creative':          {'prim': 'role-prompting',   'sec': 'tree-of-thoughts'},
    'factual':           {'prim': 'step-back',        'sec': 'cot'},
    'planning':          {'prim': 'least-to-most',    'sec': 'tree-of-thoughts'},
    'analysis':          {'prim': 'self-refine',      'sec': 'meta-prompting'},
    'longform':          {'prim': 'skeleton',         'sec': 'prompt-chaining'},
    'conversational':    {'prim': 'instruction-prompting', 'sec': 'role-prompting'},
    'agentic':           {'prim': 'react',            'sec': 'prompt-chaining'},
    'structured_output': {'prim': 'xml-structured',   'sec': 'instruction-prompting'},
    'skip':              {'prim': 'none',             'sec': 'none'}
}

# Container for all rows
all_rows = []

# --- A. LOAD SYSTEM DATASETS FROM HUGGING FACE ---

# 1. Dolly
try:
    print("📥 Loading Dolly-15k from Hugging Face...")
    dolly = load_dataset("databricks/databricks-dolly-15k", split="train")
    dolly_mapping = {
        'brainstorming': 'planning',
        'classification': 'analysis',
        'closed_qa': 'factual',
        'open_qa': 'factual',
        'generation': 'creative',
        'information_extraction': 'analysis',
        'summarization': 'longform',
        'creative_writing': 'creative'
    }
    
    for row in dolly:
        orig_category = row.get('category', '')
        if orig_category in dolly_mapping:
            prompt = row.get('instruction', '')
            label = dolly_mapping[orig_category]
            
            # Metadata computation
            ambiguity_flag = 0
            label = check_label_overrides(prompt, label)
            
            all_rows.append({
                'prompt': prompt,
                'label': label,
                'source': 'dolly',
                'platform_context': 'unknown',
                'ambiguity_flag': ambiguity_flag
            })
except Exception as e:
    print(f"⚠️ Failed to load Dolly from HF: {e}. Skipping...")

# 2. Glaive Code Assistant
try:
    print("📥 Loading Glaive Code Assistant from Hugging Face...")
    glaive = load_dataset("glaiveai/glaive-code-assistant", split="train")
    for row in glaive:
        prompt = row.get('instruction', '')
        if prompt:
            label = check_label_overrides(prompt, 'code')
            all_rows.append({
                'prompt': prompt,
                'label': label,
                'source': 'glaive',
                'platform_context': 'unknown',
                'ambiguity_flag': 0
            })
except Exception as e:
    print(f"⚠️ Failed to load Glaive from HF: {e}. Skipping...")

# 3. Alpaca
try:
    print("📥 Loading Alpaca from Hugging Face...")
    alpaca = load_dataset("tatsu-lab/alpaca", split="train")
    for row in alpaca:
        prompt = row.get('instruction', '')
        if prompt:
            matches = match_keywords(prompt)
            ambiguity_flag = 1 if len(matches) > 1 else 0
            
            # Resolve keyword classification
            if 'creative' in matches:
                label = 'creative'
            elif 'planning' in matches:
                label = 'planning'
            elif 'analysis' in matches:
                label = 'analysis'
            elif 'factual' in matches:
                label = 'factual'
            elif 'code' in matches:
                label = 'code'
            elif 'longform' in matches:
                label = 'longform'
            else:
                label = 'conversational'
                
            label = check_label_overrides(prompt, label)
            all_rows.append({
                'prompt': prompt,
                'label': label,
                'source': 'alpaca',
                'platform_context': 'unknown',
                'ambiguity_flag': ambiguity_flag
            })
except Exception as e:
    print(f"⚠️ Failed to load Alpaca from HF: {e}. Skipping...")

# 4. OpenAssistant
try:
    print("📥 Loading OpenAssistant English dataset...")
    oasst = load_dataset("OpenAssistant/oasst1", split="train")
    # Filter to English prompter nodes
    for row in oasst:
        lang = row.get('lang', '')
        role = row.get('role', '')
        prompt = row.get('text', '')
        
        if lang == 'en' and role == 'prompter' and prompt:
            matches = match_keywords(prompt)
            ambiguity_flag = 1 if len(matches) > 1 else 0
            
            if 'creative' in matches:
                label = 'creative'
            elif 'planning' in matches:
                label = 'planning'
            elif 'analysis' in matches:
                label = 'analysis'
            elif 'factual' in matches:
                label = 'factual'
            elif 'code' in matches:
                label = 'code'
            elif 'longform' in matches:
                label = 'longform'
            else:
                label = 'conversational'
                
            label = check_label_overrides(prompt, label)
            all_rows.append({
                'prompt': prompt,
                'label': label,
                'source': 'oasst',
                'platform_context': 'unknown',
                'ambiguity_flag': ambiguity_flag
            })
except Exception as e:
    print(f"⚠️ Failed to load OpenAssistant from HF: {e}. Skipping...")

# 5. Awesome ChatGPT Prompts
try:
    print("📥 Loading Awesome ChatGPT Prompts...")
    awesome = load_dataset("fka/awesome-chatgpt-prompts", split="train")
    for row in awesome:
        prompt = row.get('prompt', '')
        if prompt:
            matches = match_keywords(prompt)
            ambiguity_flag = 1 if len(matches) > 1 else 0
            
            label = 'creative' if 'creative' in matches else 'conversational'
            label = check_label_overrides(prompt, label)
            
            all_rows.append({
                'prompt': prompt,
                'label': label,
                'source': 'awesome-chatgpt-prompts',
                'platform_context': 'unknown',
                'ambiguity_flag': ambiguity_flag
            })
except Exception as e:
    print(f"⚠️ Failed to load Awesome ChatGPT Prompts from HF: {e}. Skipping...")


# --- B. LOAD LOCAL GENERATED CSV FILE IF PRESENT ---
local_csv = "promptsmith_dataset.csv"
if os.path.exists(local_csv):
    try:
        print(f"📥 Loading local generated prompts from '{local_csv}' using resilient parser...")
        with open(local_csv, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            header = next(reader, None)  # Skip header
            
            for row in reader:
                if not row or len(row) < 2:
                    continue
                prompt = row[0]
                label = row[1]
                
                # Fallback remapping if using older CSV labels
                if label == 'cot': label = 'math'
                if label == 'pot': label = 'code'
                
                # Determine platform and ambiguity flag based on row length
                platform_context = 'chatgpt'
                ambiguity_flag = 0
                
                if len(row) == 12:
                    platform_context = row[7]
                    try:
                        ambiguity_flag = int(row[9])
                    except ValueError:
                        ambiguity_flag = 0
                
                if prompt:
                    label = check_label_overrides(prompt, label)
                    all_rows.append({
                        'prompt': prompt,
                        'label': label,
                        'source': 'generated',
                        'platform_context': platform_context,
                        'ambiguity_flag': ambiguity_flag
                    })
    except Exception as e:
        print(f"⚠️ Error reading local CSV: {e}")
else:
    print(f"ℹ️ No local generated file '{local_csv}' found to merge.")


# --- C. MERGE MANUAL AND PROGRAMMATIC SKIPS ---
for prompt in total_skip_prompts:
    all_rows.append({
        'prompt': prompt,
        'label': 'skip',
        'source': 'manual_script',
        'platform_context': 'unknown',
        'ambiguity_flag': 0
    })

print(f"🔄 Total parsed raw rows combined: {len(all_rows)}")


# --- D. COMPUTATION & METADATA ENRICHMENT ---
df_final = pd.DataFrame(all_rows)

# Drop any rows with null/empty prompts
df_final = df_final.dropna(subset=['prompt'])
df_final = df_final[df_final['prompt'].str.strip() != '']

print("📈 Enriching metadata, length buckets, styles, and technique chains...")

# Compute remaining columns dynamically
df_final['prompt_length_bucket'] = df_final['prompt'].apply(get_length_bucket)
df_final['language_style'] = df_final['prompt'].apply(get_language_style)
df_final['dataset_version'] = 'v1'
df_final['complexity'] = df_final['prompt'].apply(
    lambda p: 'complex' if len(str(p).split()) > 50 else ('medium' if len(str(p).split()) > 15 else 'simple')
)
df_final['model_target'] = 'standard'

# Assign techniques dynamically from layout
df_final['technique'] = df_final['label'].apply(lambda l: TECHNIQUES.get(l, TECHNIQUES['skip'])['prim'])
df_final['secondary_technique'] = df_final['label'].apply(lambda l: TECHNIQUES.get(l, TECHNIQUES['skip'])['sec'])


# --- E. SHUFFLE AND LABEL BALANCING ---
print("⚖️ Balancing label distributions (Target: 700 per category, Skips kept complete)...")

balanced_dfs = []
grouped = df_final.groupby('label')

for label_name, group in grouped:
    # Shuffle group internally
    shuffled_group = group.sample(frac=1, random_state=42)
    
    if label_name == 'skip':
        # Keep skips as-is
        balanced_dfs.append(shuffled_group)
    else:
        # Balance up to 700 samples
        count = len(shuffled_group)
        if count < 700:
            print(f"⚠️ Warning: Label '{label_name}' has only {count} rows. Keep all, no downsampling.")
            balanced_dfs.append(shuffled_group)
        else:
            balanced_dfs.append(shuffled_group.head(700))

# Concatenate back
df_balanced = pd.concat(balanced_dfs).sample(frac=1, random_state=42).reset_index(drop=True)

# Select final columns in precise requested order
COLUMNS_ORDER = [
    'prompt', 'label', 'technique', 'secondary_technique', 'complexity', 
    'model_target', 'source', 'platform_context', 'prompt_length_bucket', 
    'ambiguity_flag', 'language_style', 'dataset_version'
]
df_balanced = df_balanced[COLUMNS_ORDER]

# Output file path
output_path = "promptsmith_dataset_v1.csv"
df_balanced.to_csv(output_path, index=False, quoting=csv.QUOTE_MINIMAL)

print("\n" + "="*50)
print(f"🏆 SUCCESS: Balanced dataset saved as '{output_path}'")
print(f"🏆 Total Final Rows: {df_balanced.shape[0]}")
print("="*50)

# Print Distribution Tables
print("\n📊 Final Class Distribution:")
print(df_balanced['label'].value_counts())

print("\n📊 Class Distribution by Source:")
source_dist = df_balanced.groupby(['label', 'source']).size().unstack(fill_value=0)
print(source_dist)
print("="*50 + "\n")
