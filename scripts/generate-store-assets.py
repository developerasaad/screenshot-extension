import os
from PIL import Image, ImageDraw, ImageFont

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT_DIR, 'assets')
ICONS_DIR = os.path.join(ROOT_DIR, 'public', 'icons')
SOURCE_LOGO = os.path.join(OUT_DIR, 'logo.png')

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(ICONS_DIR, exist_ok=True)

FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT_REG = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()

logo_img = Image.open(SOURCE_LOGO).convert('RGBA')

# 1. Generate Extension Icons & 300x300 Store Logo
for size in [16, 32, 48, 128]:
    resized = logo_img.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(os.path.join(ICONS_DIR, f'icon{size}.png'))
    print(f'Generated icon{size}.png')

logo_300 = logo_img.resize((300, 300), Image.Resampling.LANCZOS)
logo_300.save(os.path.join(OUT_DIR, 'logo_300x300.png'))
print('Generated logo_300x300.png')

# 2. Small Promotional Tile (440 x 280)
small_promo = Image.new('RGBA', (440, 280), '#09090b')
draw = ImageDraw.Draw(small_promo)

# Draw subtle border
draw.rectangle([0, 0, 439, 279], outline='#27272a', width=1)

# Center logo icon (96x96)
icon_small = logo_img.resize((96, 96), Image.Resampling.LANCZOS)
small_promo.paste(icon_small, (172, 38), icon_small)

# Title & Subtitle
font_title = get_font(FONT_BOLD, 22)
font_sub = get_font(FONT_REG, 13)
font_tag = get_font(FONT_BOLD, 10)

draw.text((220, 155), 'ScreenShot', fill='#fafafa', font=font_title, anchor='mm')
draw.text((220, 185), 'Full-Page Webpage Capture', fill='#a1a1aa', font=font_sub, anchor='mm')

# Feature tag badge
badge_box = [135, 215, 305, 245]
draw.rounded_rectangle(badge_box, radius=6, fill='#18181b', outline='#27272a', width=1)
draw.text((220, 230), 'VIEW  •  SAVE  •  COPY', fill='#38bdf8', font=font_tag, anchor='mm')

small_promo.save(os.path.join(OUT_DIR, 'promo_small_440x280.png'))
print('Generated promo_small_440x280.png')

# 3. Large Promotional Tile (1400 x 560)
large_promo = Image.new('RGBA', (1400, 560), '#09090b')
draw = ImageDraw.Draw(large_promo)

# Left side branding
icon_large = logo_img.resize((140, 140), Image.Resampling.LANCZOS)
large_promo.paste(icon_large, (100, 90), icon_large)

font_l_title = get_font(FONT_BOLD, 42)
font_l_sub = get_font(FONT_REG, 20)
font_l_body = get_font(FONT_REG, 15)

draw.text((100, 270), 'ScreenShot', fill='#fafafa', font=font_l_title)
draw.text((100, 330), 'Full-Page Webpage Capture for Chrome & Edge', fill='#38bdf8', font=font_l_sub)
draw.text((100, 380), '• High-resolution full document & 2D scroll capture\n• Nested sidebar, filter, and table expansion\n• 100% local, private, and zero bloat', fill='#a1a1aa', font=font_l_body, spacing=8)

# Right side mockup card
mock_x, mock_y, mock_w, mock_h = 740, 70, 580, 420
draw.rounded_rectangle([mock_x, mock_y, mock_x + mock_w, mock_y + mock_h], radius=14, fill='#18181b', outline='#27272a', width=2)

# Browser header bar
draw.rounded_rectangle([mock_x, mock_y, mock_x + mock_w, mock_y + 42], radius=14, fill='#27272a')
draw.ellipse([mock_x + 16, mock_y + 15, mock_x + 28, mock_y + 27], fill='#ef4444')
draw.ellipse([mock_x + 36, mock_y + 15, mock_x + 48, mock_y + 27], fill='#eab308')
draw.ellipse([mock_x + 56, mock_y + 15, mock_x + 68, mock_y + 27], fill='#22c55e')

# Mockup Webpage preview
draw.rectangle([mock_x + 20, mock_y + 60, mock_x + 220, mock_y + 90], fill='#38bdf8')
draw.rectangle([mock_x + 20, mock_y + 110, mock_x + 560, mock_y + 280], fill='#222226', outline='#2e2e34')
draw.rectangle([mock_x + 20, mock_y + 300, mock_x + 280, mock_y + 400], fill='#222226', outline='#2e2e34')
draw.rectangle([mock_x + 300, mock_y + 300, mock_x + 560, mock_y + 400], fill='#222226', outline='#2e2e34')

# Floating Result Dialog Overlay in mockup
dlg_x, dlg_y, dlg_w, dlg_h = mock_x + 240, mock_y + 70, 300, 130
draw.rounded_rectangle([dlg_x, dlg_y, dlg_x + dlg_w, dlg_y + dlg_h], radius=10, fill='#18181b', outline='#3f3f46', width=2)
draw.text((dlg_x + 18, dlg_y + 25), '✓  Screenshot captured', fill='#fafafa', font=get_font(FONT_BOLD, 14))

# Action buttons in mock dialog
btn1 = [dlg_x + 18, dlg_y + 65, dlg_x + 95, dlg_y + 105]
btn2 = [dlg_x + 105, dlg_y + 65, dlg_x + 185, dlg_y + 105]
btn3 = [dlg_x + 195, dlg_y + 65, dlg_x + 282, dlg_y + 105]
draw.rounded_rectangle(btn1, radius=6, fill='#27272a', outline='#3f3f46')
draw.rounded_rectangle(btn2, radius=6, fill='#27272a', outline='#3f3f46')
draw.rounded_rectangle(btn3, radius=6, fill='#fafafa')

draw.text((dlg_x + 56, dlg_y + 85), 'View', fill='#fafafa', font=get_font(FONT_BOLD, 12), anchor='mm')
draw.text((dlg_x + 145, dlg_y + 85), 'Copy', fill='#fafafa', font=get_font(FONT_BOLD, 12), anchor='mm')
draw.text((dlg_x + 238, dlg_y + 85), 'Save', fill='#09090b', font=get_font(FONT_BOLD, 12), anchor='mm')

large_promo.save(os.path.join(OUT_DIR, 'promo_large_1400x560.png'))
print('Generated promo_large_1400x560.png')

# 4. Screenshots (1280 x 800)
def create_store_screenshot(title, subtitle, highlight_feature):
    img = Image.new('RGBA', (1280, 800), '#09090b')
    d = ImageDraw.Draw(img)

    # Top presentation header
    d.text((640, 48), title, fill='#fafafa', font=get_font(FONT_BOLD, 30), anchor='mm')
    d.text((640, 85), subtitle, fill='#a1a1aa', font=get_font(FONT_REG, 17), anchor='mm')

    # Main Browser Canvas (1120 x 620)
    bx, by, bw, bh = 80, 130, 1120, 620
    d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=12, fill='#121215', outline='#27272a', width=2)

    # Window header bar
    d.rounded_rectangle([bx, by, bx + bw, by + 46], radius=12, fill='#18181b')
    d.ellipse([bx + 20, by + 18, bx + 32, by + 30], fill='#ef4444')
    d.ellipse([bx + 40, by + 18, bx + 52, by + 30], fill='#eab308')
    d.ellipse([bx + 60, by + 18, bx + 72, by + 30], fill='#22c55e')

    # Address bar
    d.rounded_rectangle([bx + 160, by + 10, bx + bw - 160, by + 36], radius=6, fill='#27272a')
    d.text((bx + bw/2, by + 23), 'https://example.com/store/products', fill='#71717a', font=get_font(FONT_REG, 12), anchor='mm')

    if highlight_feature == 'full_page':
        # Webpage layout representation
        d.rectangle([bx + 40, by + 75, bx + 240, by + 110], fill='#38bdf8')
        d.rectangle([bx + 40, by + 130, bx + 260, by + 570], fill='#18181b', outline='#27272a')
        d.text((bx + 60, by + 155), 'Filter & Categories', fill='#fafafa', font=get_font(FONT_BOLD, 13))
        for idx, cat in enumerate(['Audio Gear', 'Keyboards', 'Displays', 'Wearables', 'Computing', 'Power & Chargers', 'Desk Accessories']):
            d.text((bx + 60, by + 195 + idx*38), f'☐  {cat}', fill='#94a3b8', font=get_font(FONT_REG, 12))

        # Product Grid (Right)
        for row in range(2):
            for col in range(3):
                px = bx + 300 + col * 260
                py = by + 130 + row * 220
                d.rounded_rectangle([px, py, px + 240, py + 200], radius=8, fill='#18181b', outline='#27272a')
                d.rectangle([px + 10, py + 10, px + 230, py + 120], fill='#27272a')
                d.text((px + 15, py + 140), f'Product Item #{row*3 + col + 1}', fill='#fafafa', font=get_font(FONT_BOLD, 13))
                d.text((px + 15, py + 165), '$199.00  •  In Stock', fill='#22c55e', font=get_font(FONT_REG, 12))

        # Result Dialog (Top Right)
        rx, ry, rw, rh = bx + bw - 360, by + 65, 330, 135
        d.rounded_rectangle([rx, ry, rx + rw, ry + rh], radius=10, fill='#18181b', outline='#38bdf8', width=2)
        d.text((rx + 20, ry + 26), '✓  Screenshot captured', fill='#fafafa', font=get_font(FONT_BOLD, 15))

        b1 = [rx + 16, ry + 70, rx + 106, ry + 112]
        b2 = [rx + 116, ry + 70, rx + 206, ry + 112]
        b3 = [rx + 216, ry + 70, rx + 314, ry + 112]
        d.rounded_rectangle(b1, radius=6, fill='#27272a', outline='#3f3f46')
        d.rounded_rectangle(b2, radius=6, fill='#27272a', outline='#3f3f46')
        d.rounded_rectangle(b3, radius=6, fill='#fafafa')

        d.text((rx + 61, ry + 91), '👁  View', fill='#f4f4f5', font=get_font(FONT_BOLD, 13), anchor='mm')
        d.text((rx + 161, ry + 91), '📋  Copy', fill='#f4f4f5', font=get_font(FONT_BOLD, 13), anchor='mm')
        d.text((rx + 265, ry + 91), '💾  Save', fill='#09090b', font=get_font(FONT_BOLD, 13), anchor='mm')

    elif highlight_feature == 'viewer':
        # Viewer page toolbar
        vx, vy, vw, vh = bx + 20, by + 65, bw - 40, 50
        d.rounded_rectangle([vx, vy, vx + vw, vy + vh], radius=8, fill='#18181b', outline='#27272a')
        d.text((vx + 20, vy + 25), 'Full-Page Screenshot', fill='#fafafa', font=get_font(FONT_BOLD, 14), anchor='lm')
        d.rounded_rectangle([vx + 220, vy + 12, vx + 340, vy + 38], radius=6, fill='#27272a')
        d.text((vx + 280, vy + 25), '1920 × 4800 px', fill='#a1a1aa', font=get_font(FONT_REG, 11), anchor='mm')

        # Toolbar right buttons
        vb1 = [vx + vw - 280, vy + 10, vx + vw - 190, vy + 40]
        vb2 = [vx + vw - 180, vy + 10, vx + vw - 95, vy + 40]
        vb3 = [vx + vw - 85, vy + 10, vx + vw - 10, vy + 40]
        d.rounded_rectangle(vb1, radius=6, fill='#27272a', outline='#3f3f46')
        d.rounded_rectangle(vb2, radius=6, fill='#052e16', outline='#15803d')
        d.rounded_rectangle(vb3, radius=6, fill='#fafafa')

        d.text((vx + vw - 235, vy + 25), '🔍 Actual Size', fill='#f4f4f5', font=get_font(FONT_BOLD, 11), anchor='mm')
        d.text((vx + vw - 137, vy + 25), '✓ Copied', fill='#86efac', font=get_font(FONT_BOLD, 11), anchor='mm')
        d.text((vx + vw - 47, vy + 25), 'Save', fill='#09090b', font=get_font(FONT_BOLD, 11), anchor='mm')

        # Stitched image preview container
        d.rounded_rectangle([bx + 180, by + 135, bx + bw - 180, by + bh - 25], radius=8, fill='#18181b', outline='#27272a')
        d.text((bx + bw/2, by + 340), 'High-Resolution Document Preview\n(100% Zoom / Fit Width Toggle)', fill='#71717a', font=get_font(FONT_REG, 16), anchor='mm')

    elif highlight_feature == 'nested_scroll':
        # Showing nested container expansion
        d.text((bx + 40, by + 80), 'Generic Nested Scroll-Container Capture', fill='#fafafa', font=get_font(FONT_BOLD, 18))
        d.text((bx + 40, by + 110), 'Sidebars, data tables, and code snippets are captured in full without scrollbar clipping.', fill='#a1a1aa', font=get_font(FONT_REG, 13))

        # Left: Sidebar Filter Expanded
        d.rounded_rectangle([bx + 40, by + 150, bx + 360, by + 570], radius=8, fill='#18181b', outline='#38bdf8', width=2)
        d.text((bx + 60, by + 175), 'Sidebar Filter (12 Categories Expanded)', fill='#38bdf8', font=get_font(FONT_BOLD, 12))
        for i in range(10):
            d.text((bx + 60, by + 210 + i*34), f'☑ Category #{i+1} — Sub-items full content', fill='#f4f4f5', font=get_font(FONT_REG, 12))

        # Right: Nested Table Full View
        d.rounded_rectangle([bx + 400, by + 150, bx + bw - 40, by + 570], radius=8, fill='#18181b', outline='#27272a')
        d.text((bx + 420, by + 175), 'Nested Multi-Row Data Table', fill='#fafafa', font=get_font(FONT_BOLD, 13))
        for r in range(9):
            row_y = by + 210 + r * 36
            d.rectangle([bx + 420, row_y, bx + bw - 60, row_y + 28], fill='#27272a' if r%2==0 else '#1e1e24')
            d.text((bx + 430, row_y + 14), f'Record #{100+r}     Service Node-0{r+1}     Status: Active     Region: global', fill='#e2e8f0', font=get_font(FONT_REG, 11), anchor='lm')

    elif highlight_feature == 'developer_ai':
        # Visual ground truth for AI coding
        d.text((bx + 40, by + 80), 'Visual Ground Truth for Web Development & AI Coding', fill='#fafafa', font=get_font(FONT_BOLD, 18))
        d.text((bx + 40, by + 110), 'Inspect computed layouts, margin collapses, and flexbox alignment with 1-click clipboard copy.', fill='#a1a1aa', font=get_font(FONT_REG, 13))

        # Left: Code vs Rendered visual comparison
        d.rounded_rectangle([bx + 40, by + 150, bx + 520, by + 570], radius=8, fill='#0f172a', outline='#38bdf8', width=2)
        d.text((bx + 60, by + 175), 'AI Coding Assistant Prompt / Chat', fill='#38bdf8', font=get_font(FONT_BOLD, 13))
        d.rounded_rectangle([bx + 60, by + 210, bx + 500, by + 340], radius=6, fill='#1e293b')
        d.text((bx + 75, by + 230), 'User: "Here is the full page screenshot.\nThe sidebar is overflowing the footer."', fill='#f8fafc', font=get_font(FONT_REG, 12))
        d.text((bx + 75, by + 280), '[🖼 Pasted Full-Page Screenshot (PNG)]', fill='#38bdf8', font=get_font(FONT_BOLD, 12))

        d.rounded_rectangle([bx + 60, by + 360, bx + 500, by + 540], radius=6, fill='#1e293b')
        d.text((bx + 75, by + 380), 'Assistant: "I see the layout collision in the\nCSS grid. Here is the updated rule:\n\n.sidebar { grid-row: span 2; }" ', fill='#86efac', font=get_font(FONT_REG, 12))

        # Right: Rendered Output Box
        d.rounded_rectangle([bx + 560, by + 150, bx + bw - 40, by + 570], radius=8, fill='#18181b', outline='#27272a')
        d.text((bx + 580, by + 175), 'Live Rendered Webpage Ground Truth', fill='#fafafa', font=get_font(FONT_BOLD, 13))
        d.rectangle([bx + 580, by + 210, bx + bw - 60, by + 350], fill='#27272a')
        d.rectangle([bx + 580, by + 370, bx + bw - 60, by + 540], fill='#27272a')
        d.text((bx + (bw + 540)/2, by + 280), 'Exact Rendered Spacing & Hierarchy', fill='#94a3b8', font=get_font(FONT_REG, 13), anchor='mm')

    return img

s1 = create_store_screenshot('One-Click Full-Page Capture', 'Capture the entire webpage instantly without clutter or bloat.', 'full_page')
s1.save(os.path.join(OUT_DIR, 'screenshot_1_full_page.png'))
print('Generated screenshot_1_full_page.png')

s2 = create_store_screenshot('Minimal Dedicated Viewer', 'Inspect high-res captures with 1:1 zoom, dimension badge, and quick actions.', 'viewer')
s2.save(os.path.join(OUT_DIR, 'screenshot_2_viewer.png'))
print('Generated screenshot_2_viewer.png')

s3 = create_store_screenshot('Nested Scroll-Container Support', 'Sidebars, filter panels, and tables are fully captured without scrollbar cutoffs.', 'nested_scroll')
s3.save(os.path.join(OUT_DIR, 'screenshot_3_nested_scroll.png'))
print('Generated screenshot_3_nested_scroll.png')

s4 = create_store_screenshot('Built for Developers & AI Workflows', 'Copy raw PNG to clipboard for instant pasting into AI chats, Figma, or Slack.', 'developer_ai')
s4.save(os.path.join(OUT_DIR, 'screenshot_4_developer_ai.png'))
print('Generated screenshot_4_developer_ai.png')
