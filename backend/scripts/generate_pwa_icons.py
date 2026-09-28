import os
from PIL import Image, ImageDraw, ImageFont

public_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'public'))
os.makedirs(public_dir, exist_ok=True)

def create_pwa_icon(size, is_maskable=False):
    # Canvas
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background
    bg_color = (11, 15, 25, 255) # #0b0f19
    corner_radius = 0 if is_maskable else int(size * 0.22)
    
    if is_maskable:
        draw.rectangle([0, 0, size, size], fill=bg_color)
    else:
        draw.rounded_rectangle([0, 0, size, size], radius=corner_radius, fill=bg_color)

    # Gradient glow circle in center
    scale = 0.65 if is_maskable else 0.80
    center_x = size // 2
    center_y = size // 2
    radius = int(size * scale * 0.45)

    # Draw outer glow circle
    glow_color = (79, 70, 229, 255) # #4f46e5 Indigo
    purple_glow = (168, 85, 247, 255) # #a855f7 Purple
    
    # Shield / Hexagon / Rounded badge in center
    badge_w = int(size * scale * 0.70)
    badge_h = int(size * scale * 0.70)
    x0 = center_x - badge_w // 2
    y0 = center_y - badge_h // 2 - int(size * 0.05)
    x1 = center_x + badge_w // 2
    y1 = y0 + badge_h

    draw.rounded_rectangle([x0, y0, x1, y1], radius=int(badge_w * 0.25), fill=(30, 27, 75, 255), outline=glow_color, width=max(2, size // 64))

    # Center Emblem: Stylized Shield / Lightning / Brain nodes
    emblem_margin = int(badge_w * 0.22)
    
    # Draw graduation cap / shield geometric polygon
    pts = [
        (center_x, y0 + emblem_margin),
        (x1 - emblem_margin, y0 + int(badge_h * 0.45)),
        (center_x, y1 - emblem_margin),
        (x0 + emblem_margin, y0 + int(badge_h * 0.45)),
    ]
    draw.polygon(pts, fill=glow_color)

    inner_pts = [
        (center_x, y0 + emblem_margin + int(size * 0.04)),
        (x1 - emblem_margin - int(size * 0.03), y0 + int(badge_h * 0.45)),
        (center_x, y1 - emblem_margin - int(size * 0.04)),
        (x0 + emblem_margin + int(size * 0.03), y0 + int(badge_h * 0.45)),
    ]
    draw.polygon(inner_pts, fill=purple_glow)

    # Core AI pupil / spark
    spark_r = max(3, int(size * 0.04))
    core_y = y0 + int(badge_h * 0.45)
    draw.ellipse([center_x - spark_r, core_y - spark_r, center_x + spark_r, core_y + spark_r], fill=(255, 255, 255, 255))

    # Bottom Text "EXAM.AI"
    text_y = y1 + int(size * 0.03)
    if text_y + int(size * 0.12) < size:
        # Draw "EXAM.AI" bottom indicator pill
        pill_w = int(size * 0.52)
        pill_h = int(size * 0.11)
        px0 = center_x - pill_w // 2
        py0 = text_y
        px1 = center_x + pill_w // 2
        py1 = py0 + pill_h
        draw.rounded_rectangle([px0, py0, px1, py1], radius=pill_h // 2, fill=(15, 23, 42, 240), outline=(99, 102, 241, 200), width=max(1, size // 128))
        
        # Draw text dots for AI indicator
        dot_r = max(2, int(size * 0.015))
        draw.ellipse([px0 + int(pill_w * 0.2) - dot_r, py0 + pill_h // 2 - dot_r, px0 + int(pill_w * 0.2) + dot_r, py0 + pill_h // 2 + dot_r], fill=(34, 197, 94, 255))
        draw.ellipse([px0 + int(pill_w * 0.5) - dot_r, py0 + pill_h // 2 - dot_r, px0 + int(pill_w * 0.5) + dot_r, py0 + pill_h // 2 + dot_r], fill=(99, 102, 241, 255))
        draw.ellipse([px0 + int(pill_w * 0.8) - dot_r, py0 + pill_h // 2 - dot_r, px0 + int(pill_w * 0.8) + dot_r, py0 + pill_h // 2 + dot_r], fill=(168, 85, 247, 255))

    return img

# Generate all icons
sizes = {
    "pwa-192x192.png": (192, False),
    "pwa-512x512.png": (512, False),
    "pwa-maskable-192x192.png": (192, True),
    "pwa-maskable-512x512.png": (512, True),
    "apple-touch-icon.png": (180, False),
    "favicon-32x32.png": (32, False),
    "favicon-16x16.png": (16, False)
}

for filename, (sz, maskable) in sizes.items():
    icon = create_pwa_icon(sz, is_maskable=maskable)
    out_path = os.path.join(public_dir, filename)
    icon.save(out_path, "PNG")
    print(f"Generated {filename} ({sz}x{sz}, maskable={maskable}) -> {out_path}")
