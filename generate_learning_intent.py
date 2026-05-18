import csv
import random

# Exact metadata logic from prepare_dataset.py
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

def get_complexity(text):
    words = len(str(text).split())
    if words > 50:
        return 'complex'
    elif words > 15:
        return 'medium'
    else:
        return 'simple'

# 100 curated, highly realistic learning-intent prompts focusing on goals, roadmaps, and understanding concepts.
# They are structured with varied language styles (casual, Indian English, formal, technical) and lengths.
prompts = [
    # --- 1-10: Casual, short phrasing with slang/shortcuts ---
    "i want to learn rag",
    "how do i get started with machine learning",
    "i want to understand how transformers work",
    "teach me react from scratch",
    "i want to learn prompt engineering",
    "how do i become a data scientist",
    "i want to get into web3 development",
    "explain docker to me i am a beginner",
    "i want to master python",
    "how do i learn to build chrome extensions",

    # --- 11-25: Indian English style (kindly, please, want to know) ---
    "kindly explain what are the steps to learn java from basic to advanced level",
    "can you please give me a proper roadmap to get into cyber security as a beginner",
    "i want to know how to start learning stock market trading in india",
    "please guide me how do i learn node js backend development from home",
    "kindly share a study plan to master data structures and algorithms in 3 months",
    "how do i start learning ethical hacking from scratch can you please suggest",
    "please tell me the syllabus i need to study to become a cloud engineer",
    "kindly help me how to learn english speaking fluently, make a weekly schedule",
    "i want to know the best way to get started with learning deep learning",
    "please explain the path to become a full stack developer for a non tech person",
    "can you kindly teach me how to play acoustic guitar, give a step by step guide",
    "i want to know how i can learn to draw portraits, suggest some online resources",
    "please share a learning plan for digital marketing for a small business owner",
    "kindly suggest a roadmap to learn web development using next js and tailwind",
    "can you please tell me how to start learning quantum computing as a high school student",

    # --- 26-40: Casual/typos & conversational style ---
    "yo want to learn nextjs app router, how to start? any good tutorials?",
    "idk how to start with rust programming, can u help me make a learning plan",
    "wanna get into UI/UX design, what tools should i learn and how do i practice?",
    "pls teach me docker and kubernetes from scratch, explain like i am five",
    "how to learn statistics for data science, i hate math so make it simple pls",
    "wanna learn how to build mobile apps, should i learn react native or flutter?",
    "gonna learn photography this weekend, what are the basic settings i need to understand first?",
    "hey how do i learn to play chess, i literally don't even know how the pieces move",
    "wanna start learning about space exploration and rocketry, suggest some books",
    "how to learn touch typing quickly, any good websites or exercises?",
    "gonna learn sourdough baking, what do i need and what is the step by step process?",
    "wanna understand generative ai and llms, where should a absolute beginner start?",
    "idk how to learn git and github, can u write down the basic commands to master first",
    "gonna learn wood carving, what tools do i need to buy to get started safely?",
    "pls suggest a roadmap to learn seo and google analytics from scratch",

    # --- 41-55: Technical style (with industry vocabulary, functions, algorithms) ---
    "how do i learn to implement graph algorithms and dynamic programming in python",
    "i want to learn database schema design and normalization, explain the standard rules",
    "teach me microservices architecture pattern, how do i study routing and event sourcing",
    "how do i start learning compiler design, explain parsers and AST representation",
    "i want to master systems design for scalability, suggest a learning path and topics",
    "explain reinforcement learning algorithms like Q-learning and policy gradients for a beginner",
    "how to learn api development with fastapi, teach me path parameters and dependency injection",
    "i want to learn about vector databases and cosine similarity for rag applications",
    "teach me prompt injection defense strategies and adversarial evaluation methods",
    "how do i get into devops engineering, list the monitoring and ci cd tools to learn",
    "i want to learn how to write clean code using SOLID principles, show me the roadmap",
    "teach me discrete mathematics and graph theory for computer science analysis",
    "how to start learning blockchain development, smart contracts, and solidity",
    "i want to learn cloud infrastructure orchestration with terraform, suggest a basic syllabus",
    "explain retrieval augmented generation architecture so i can learn to build custom pipelines",

    # --- 56-75: Formal/academic and structured learning roadmaps ---
    "I am looking for a comprehensive curriculum to study organic chemistry independently.",
    "Can you provide a structured learning path for mastering linear algebra for machine learning?",
    "I want to understand the foundational concepts of astrophysics. What topics should I study first?",
    "Could you outline a 30-day study schedule for preparing for a software engineering interview?",
    "I wish to study microeconomics from the ground up. Please recommend a syllabus and textbooks.",
    "What is the most effective methodology for learning a new foreign language like French from scratch?",
    "I want to study the history of Western philosophy. Please provide a chronological learning guide.",
    "Could you compile a list of subjects and topics required to become a telecommunications engineer?",
    "I want to learn financial statement analysis. Please explain how to read balance sheets and income statements.",
    "Please suggest a learning roadmap to master typography and visual hierarchy in graphic design.",
    "I am seeking a self-study plan to learn calculus and differential equations for engineering.",
    "What are the essential concepts one must learn to build a production-ready rest api using node js?",
    "I want to understand the mechanics of stock market investing and portfolio management. Where should I begin?",
    "Could you provide a detailed guide on how to learn watercolor painting techniques for beginners?",
    "I would like to learn the principles of copywriting for high-converting landing pages. Please outline a study plan.",
    "Please guide me on how to learn and practice mindfulness and meditation systematically.",
    "I want to study clean energy technology and solar engineering. Suggest a list of key concepts to learn.",
    "Could you write a syllabus for learning data visualization using tools like tableau and power bi?",
    "I want to learn the fundamentals of product management and product analytics. What is the recommended path?",
    "Please outline the learning journey required to understand quantum mechanics and wave-particle duality.",

    # --- 76-100: Detailed, multi-sentence contextual queries ---
    "I want to learn how to build web applications using React. I have a basic understanding of HTML and CSS, but JavaScript is still very new to me. How should I structure my learning over the next month?",
    "How do I get started with game development using Unity? I want to create simple 2D games first before moving to 3D. Please give me a step by step guide on what tools to download and what tutorials to watch.",
    "I am looking to change my career path and get into cyber security. I have no technical background. Could you provide a 6-month learning plan that covers networking, Linux, and basic security concepts?",
    "I want to learn how to play the piano. I recently bought a 61-key keyboard and want to teach myself at home. What are the first exercises, finger positions, and music theory concepts I should focus on?",
    "How to get started with data analysis? I have a business background and want to learn how to clean, analyze, and visualize data using Python and libraries like Pandas and Matplotlib. Can you write a roadmap for me?",
    "I want to understand how deep learning and neural networks work under the hood. I know the high-level concepts, but I want to learn the mathematics behind backpropagation and gradient descent. Suggest a syllabus.",
    "I want to learn how to edit videos professionally using DaVinci Resolve. I have some footage from my travels and want to learn cutting, color grading, and audio mixing. What is the best learning order?",
    "How do I start learning 3D modeling and animation in Blender? I want to create stylized characters for games. Please provide a weekly learning plan for the first month to get comfortable with the interface.",
    "I want to learn about large language models, specifically how to fine-tune them on custom datasets. I already know Python and basic PyTorch. What concepts and tools (like Hugging Face) do I need to study?",
    "I am planning to build a mobile app and want to learn Flutter. I have some Java experience from college. How do I transition to Dart and what are the state management libraries I need to learn first?",
    "I want to learn about the history of art and architectural styles from the Renaissance to modern times. Can you write a structured syllabus with major movements, key artists, and suggested virtual museum tours?",
    "How do I get into Web3 development? I want to learn how to write smart contracts in Solidity and deploy them on the Ethereum network. What tools (like Hardhat and Ethers.js) should be in my learning roadmap?",
    "I want to learn how to write clean, modular, and maintainable CSS. I always end up with spaghetti code. Teach me about BEM methodology, CSS custom properties, and preprocessors like Sass. Where do I start?",
    "I want to learn how to design and build databases that can handle millions of rows. How do I study indexing, partitioning, query optimization, and transaction isolation levels? Suggest a learning strategy.",
    "How do I start learning competitive programming? I want to participate in Codeforces rounds. What algorithms, data structures, and mathematical concepts do I need to master to solve Level B and C problems?",
    "I want to learn how to write professional copy for email newsletters. I want to learn about open rates, click-through rates, call to actions, and subject line hook formulas. What should my study plan look like?",
    "I want to learn how to build chrome extensions from zero. I want to create a tool that highlights text and saves it to a local database. What are the key manifest V3 concepts and APIs I must study?",
    "How do I start learning discrete mathematics? I need it for my university algorithms class. Please suggest a structured plan covering set theory, combinatorics, proof by induction, and boolean algebra.",
    "I want to learn how to create interactive data dashboards in Python. Teach me about Dash, Streamlit, and Plotly. What is the best sequence to learn these tools for someone who already knows basic Python?",
    "I want to learn about prompt engineering techniques like chain-of-thought, self-consistency, and skeleton-of-thought prompting. How do I systematically test and compare their effectiveness on complex reasoning tasks?",
    "How to learn product design? I want to understand how to conduct user research, create user personas, build wireframes, and run usability testing. Suggest a complete curriculum for self-study.",
    "I want to learn how to perform professional photo editing and color correction in Adobe Lightroom. Please explain the histogram, tone curve, HSL panel, and masking tools, and give me a learning guide.",
    "I want to get into DevOps. I already know how to code in Python and have basic Linux skills. How do I start learning about cloud providers, containerization with Docker, and CI/CD pipelines with GitHub Actions?",
    "I want to learn about the physics of flight and aerodynamics. What are the core topics, math prerequisites, and introductory textbooks I should study to understand how aircraft lift and drag work?",
    "How do I learn how to build microservices? I want to understand API gateways, service discovery, container orchestration, and message queues like RabbitMQ for inter-service communication. Write a study plan."
]

# Generate rows with exact columns
header = [
    "prompt", "label", "technique", "secondary_technique", "complexity", 
    "model_target", "source", "platform_context", "prompt_length_bucket", 
    "ambiguity_flag", "language_style", "dataset_version"
]

rows = []
for p in prompts:
    # Randomly select a platform context
    platform = random.choice(['chatgpt', 'claude', 'gemini'])
    
    row = [
        p,
        "planning",
        "least-to-most",
        "tree-of-thoughts",
        get_complexity(p),
        "standard",
        "generated",
        platform,
        get_length_bucket(p),
        0,
        get_language_style(p),
        "v1"
    ]
    rows.append(row)

# Save to a new CSV file
output_file = "learning_intent_planning.csv"
with open(output_file, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(header)
    writer.writerows(rows)

print(f"✨ Successfully generated {len(rows)} CSV rows and saved to '{output_file}'!")
