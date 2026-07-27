import os
import re

files_to_modify = ['appointment.html', 'suivi.html', 'contact.html']

for filepath in files_to_modify:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We will find all <div class="form-group"> that contain a label and an input/textarea
    # and transform them to <div class="form-group floating">
    
    # Regex to capture the label block and input block
    pattern = re.compile(
        r'<div\s+class="form-group">\s*<label\s+for="([^"]+)">([^<]+(?:<span[^>]*>[^<]*</span>)?)</label>\s*<(input|textarea|select)([^>]+)>(.*?)</\3>|<div\s+class="form-group">\s*<label\s+for="([^"]+)">([^<]+(?:<span[^>]*>[^<]*</span>)?)</label>\s*<input([^>]+)>',
        re.IGNORECASE | re.DOTALL
    )
    
    def replacer(match):
        # Match groups
        # If it's a textarea/select (with closing tag)
        if match.group(3):
            tag = match.group(3)
            label_for = match.group(1)
            label_text = match.group(2)
            attrs = match.group(4)
            inner = match.group(5)
            
            # ensure placeholder=" " for inputs/textareas to make the CSS hack work
            if tag in ['input', 'textarea']:
                if 'placeholder=' in attrs:
                    attrs = re.sub(r'placeholder="[^"]*"', 'placeholder=" "', attrs)
                else:
                    attrs += ' placeholder=" "'
            
            return f'<div class="form-group floating">\n                                <{tag}{attrs}>{inner}</{tag}>\n                                <label for="{label_for}">{label_text.strip()}</label>'
            
        # If it's an input (no closing tag)
        elif match.group(8):
            label_for = match.group(6)
            label_text = match.group(7)
            attrs = match.group(8)
            
            if 'placeholder=' in attrs:
                attrs = re.sub(r'placeholder="[^"]*"', 'placeholder=" "', attrs)
            else:
                attrs += ' placeholder=" "'
                
            return f'<div class="form-group floating">\n                                <input{attrs}>\n                                <label for="{label_for}">{label_text.strip()}</label>'
        
        return match.group(0)

    new_content = pattern.sub(replacer, content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Processed {filepath}")
