import sys

def check_brackets(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()
        
    stack = []
    
    for i, line in enumerate(lines):
        for j, char in enumerate(line):
            if char in "{[(":
                stack.append((char, i+1, j+1))
            elif char in "}])":
                if not stack:
                    print(f"Extra closing {char} at {i+1}:{j+1}")
                    return
                top_char, top_i, top_j = stack.pop()
                expected = {'{': '}', '[': ']', '(': ')'}[top_char]
                if char != expected:
                    print(f"Mismatched {char} at {i+1}:{j+1}. Expected {expected} to close {top_char} from {top_i}:{top_j}")
                    return

    if stack:
        for char, i, j in stack:
            print(f"Unclosed {char} at {i}:{j}")
    else:
        print("All brackets balanced!")

check_brackets('src/app/barber/dashboard/page.tsx')
