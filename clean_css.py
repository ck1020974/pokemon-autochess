import os
import re

path = r'src\index.css'
try:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
except UnicodeDecodeError:
    with open(path, 'r', encoding='utf-16') as f:
        content = f.read()

# Pattern for the corrupted spaced out text
pattern = r'\.\s*o\s*p\s*p\s*o\s*n\s*e\s*n\s*t\s*-\s*c\s*a\s*r\s*d.*?}\s*}'
new_content = re.sub(
    pattern,
    """.opponent-card {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.opponent-card:hover {
  transform: translateY(-10px) scale(1.05);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1)) !important;
  border-color: rgba(255, 255, 255, 0.4) !important;
  box-shadow: 0 10px 25px rgba(255, 255, 255, 0.2), 0 0 15px rgba(255, 255, 255, 0.1);
}

.opponent-name {
  transition: color 0.2s;
}

.opponent-card:hover .opponent-name {
  color: #ffd700 !important;
}""",
    content,
    flags=re.DOTALL
)

if new_content != content:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully cleaned index.css")
else:
    print("No corruption found or pattern didn't match")
