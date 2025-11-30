from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime
import uuid

app = Flask(__name__)
CORS(app)

# Product Catalog with realistic image URLs
PRODUCTS = [
    {
        "id": "mug-001",
        "name": "Ceramic Coffee Mug",
        "description": "Beautiful handcrafted ceramic mug perfect for your morning coffee",
        "price": 799,
        "currency": "INR",
        "category": "mug",
        "color": "white",
        "image": "https://rukminim2.flixcart.com/image/480/640/xif0q/mug/6/q/0/ceramic-coffee-mug-milk-cup-purple-450-ml-450-1-unique-utilities-original-imahbysfg79eqb3x.jpeg?q=90"
    },
    {
        "id": "mug-002",
        "name": "Stoneware Coffee Mug",
        "description": "Rustic stoneware mug with premium finish",
        "price": 899,
        "currency": "INR",
        "category": "mug",
        "color": "brown",
        "image": "https://earthan.in/cdn/shop/products/02YellowBlueCeramicCup1.jpg?v=1744113802"
    },
    {
        "id": "tshirt-001",
        "name": "Cotton T-Shirt",
        "description": "Comfortable 100% cotton t-shirt",
        "price": 599,
        "currency": "INR",
        "category": "tshirt",
        "color": "white",
        "size": "M",
        "image": "https://www.thestiffcollar.com/cdn/shop/files/03.jpg?v=1683199859&width=1300"
    },
    {
        "id": "tshirt-002",
        "name": "Premium Cotton T-Shirt",
        "description": "Premium quality organic cotton t-shirt",
        "price": 899,
        "currency": "INR",
        "category": "tshirt",
        "color": "black",
        "size": "L",
        "image": "https://m.media-amazon.com/images/I/81fnZi8J8LL._AC_UY1100_.jpg"
    },
    {
        "id": "hoodie-001",
        "name": "Classic Hoodie",
        "description": "Warm and cozy cotton blend hoodie",
        "price": 1599,
        "currency": "INR",
        "category": "hoodie",
        "color": "black",
        "size": "M",
        "image": "https://nobero.com/cdn/shop/files/NavyBlue_fcc93fe9-f65b-4710-82bd-5d2fed4335e2.jpg?v=1758998339"
    },
    {
        "id": "hoodie-002",
        "name": "Premium Fleece Hoodie",
        "description": "Ultra-soft fleece hoodie with premium finish",
        "price": 1899,
        "currency": "INR",
        "category": "hoodie",
        "color": "gray",
        "size": "L",
        "image": "https://images-cdn.ubuy.co.in/63a2bf3746102522112c125a-womens-hoodie-sweatshirt-oversized.jpg"
    },
    {
        "id": "bottle-001",
        "name": "Steel Water Bottle",
        "description": "Insulated stainless steel water bottle",
        "price": 699,
        "currency": "INR",
        "category": "bottle",
        "color": "silver",
        "image": "https://cdn.moglix.com/p/ammXnD4pmimYk-xxlarge.jpg"
    },
    {
        "id": "bag-001",
        "name": "Canvas Tote Bag",
        "description": "Eco-friendly canvas tote bag",
        "price": 499,
        "currency": "INR",
        "category": "bag",
        "color": "beige",
        "image": "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop"
    },
    {
        "id": "watch-001",
        "name": "Smart Watch",
        "description": "Feature-rich smartwatch with health tracking",
        "price": 2499,
        "currency": "INR",
        "category": "watch",
        "color": "black",
        "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop"
    },
    {
        "id": "shoe-001",
        "name": "Running Shoes",
        "description": "Comfortable running shoes with cushioned sole",
        "price": 3499,
        "currency": "INR",
        "category": "shoes",
        "color": "blue",
        "image": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop"
    },
    {
        "id": "headphone-001",
        "name": "Wireless Headphones",
        "description": "Premium noise-canceling wireless headphones",
        "price": 4999,
        "currency": "INR",
        "category": "headphones",
        "color": "black",
        "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop"
    },
    {
        "id": "backpack-001",
        "name": "Travel Backpack",
        "description": "Spacious travel backpack with laptop compartment",
        "price": 1999,
        "currency": "INR",
        "category": "backpack",
        "color": "gray",
        "image": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop"
    }
]

# In-memory cart storage (per session)
carts = {}

# Orders file
ORDERS_FILE = "orders.json"

def load_orders():
    if os.path.exists(ORDERS_FILE):
        with open(ORDERS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_orders(orders):
    with open(ORDERS_FILE, 'w') as f:
        json.dump(orders, f, indent=2)

@app.route('/api/catalog', methods=['GET'])
def get_catalog():
    """ACP-style catalog endpoint"""
    category = request.args.get('category')
    max_price = request.args.get('max_price', type=int)
    color = request.args.get('color')
    
    filtered_products = PRODUCTS.copy()
    
    if category:
        filtered_products = [p for p in filtered_products if p['category'].lower() == category.lower()]
    
    if max_price:
        filtered_products = [p for p in filtered_products if p['price'] <= max_price]
    
    if color:
        filtered_products = [p for p in filtered_products if p.get('color', '').lower() == color.lower()]
    
    return jsonify({
        "products": filtered_products,
        "total": len(filtered_products)
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    """AI assistant endpoint"""
    data = request.json
    user_message = data.get('message', '').lower()
    session_id = data.get('session_id', 'default')
    
    # Initialize cart for session
    if session_id not in carts:
        carts[session_id] = []
    
    response_text = ""
    products_to_show = []
    
    # Product browsing queries
    if any(word in user_message for word in ['show', 'browse', 'looking for', 'find', 'search', 'see']):
        if 'mug' in user_message or 'coffee' in user_message:
            products_to_show = [p for p in PRODUCTS if p['category'] == 'mug']
            response_text = f"I found {len(products_to_show)} amazing coffee mugs for you. "
        elif 'tshirt' in user_message or 't-shirt' in user_message or 'shirt' in user_message:
            products_to_show = [p for p in PRODUCTS if p['category'] == 'tshirt']
            if 'under' in user_message:
                try:
                    price = int(''.join(filter(str.isdigit, user_message)))
                    products_to_show = [p for p in products_to_show if p['price'] <= price]
                except:
                    pass
            response_text = f"I found {len(products_to_show)} stylish t-shirts for you. "
        elif 'hoodie' in user_message:
            products_to_show = [p for p in PRODUCTS if p['category'] == 'hoodie']
            if 'black' in user_message:
                products_to_show = [p for p in products_to_show if p['color'] == 'black']
            response_text = f"I found {len(products_to_show)} cozy hoodies for you. "
        elif 'bottle' in user_message or 'water' in user_message:
            products_to_show = [p for p in PRODUCTS if p['category'] == 'bottle']
            response_text = f"I found {len(products_to_show)} water bottles for you. "
        elif 'bag' in user_message:
            products_to_show = [p for p in PRODUCTS if 'bag' in p['category']]
            response_text = f"I found {len(products_to_show)} bags for you. "
        elif 'watch' in user_message:
            products_to_show = [p for p in PRODUCTS if p['category'] == 'watch']
            response_text = f"Check out our premium smartwatches. "
        elif 'shoe' in user_message:
            products_to_show = [p for p in PRODUCTS if p['category'] == 'shoes']
            response_text = f"Here are our comfortable running shoes. "
        elif 'headphone' in user_message:
            products_to_show = [p for p in PRODUCTS if p['category'] == 'headphones']
            response_text = f"Check out our wireless headphones. "
        elif 'backpack' in user_message:
            products_to_show = [p for p in PRODUCTS if p['category'] == 'backpack']
            response_text = f"Here's our travel backpack collection. "
        else:
            products_to_show = PRODUCTS[:6]
            response_text = "Here are some of our trending products. "
    
    # Cart operations
    elif any(word in user_message for word in ['add to cart', 'add', 'i want', "i'll take", "i'll buy"]):
        matched_product = None
        for product in PRODUCTS:
            if product['name'].lower() in user_message or product['id'] in user_message:
                matched_product = product
                break
        
        if matched_product:
            carts[session_id].append({
                "product_id": matched_product['id'],
                "name": matched_product['name'],
                "price": matched_product['price'],
                "quantity": 1,
                "image": matched_product['image']
            })
            response_text = f"Added {matched_product['name']} to your cart. It costs ₹{matched_product['price']}. Say 'checkout' when you're ready to place your order."
        else:
            response_text = "I couldn't identify which product you want to add. Could you please be more specific?"
    
    # View cart
    elif 'cart' in user_message or 'what do i have' in user_message:
        cart_items = carts[session_id]
        if cart_items:
            total = sum(item['price'] * item['quantity'] for item in cart_items)
            items_text = ', '.join([f"{item['name']} for ₹{item['price']}" for item in cart_items])
            response_text = f"Your cart has: {items_text}. Total: ₹{total}. Say 'checkout' to place your order."
        else:
            response_text = "Your cart is empty. Browse our products and add items you like!"
    
    # Checkout
    elif 'checkout' in user_message or 'place order' in user_message or 'buy now' in user_message:
        cart_items = carts[session_id]
        if cart_items:
            order_id = str(uuid.uuid4())[:8]
            total = sum(item['price'] * item['quantity'] for item in cart_items)
            
            order = {
                "id": order_id,
                "items": cart_items,
                "total": total,
                "currency": "INR",
                "status": "CONFIRMED",
                "created_at": datetime.now().isoformat()
            }
            
            orders = load_orders()
            orders.append(order)
            save_orders(orders)
            
            carts[session_id] = []
            
            response_text = f"Order confirmed! Your order ID is {order_id}. Total amount: ₹{total}. Thank you for shopping with us!"
        else:
            response_text = "Your cart is empty. Add some items first before checking out."
    
    # View last order
    elif 'last order' in user_message or 'recent order' in user_message or 'what did i buy' in user_message:
        orders = load_orders()
        if orders:
            last_order = orders[-1]
            items_text = ', '.join([f"{item['name']}" for item in last_order['items']])
            response_text = f"Your last order with ID {last_order['id']} included: {items_text}. Total: ₹{last_order['total']}."
        else:
            response_text = "You haven't placed any orders yet."
    
    # Order history
    elif 'order history' in user_message or 'all orders' in user_message or 'my orders' in user_message:
        orders = load_orders()
        if orders:
            response_text = f"You have placed {len(orders)} orders. "
            if len(orders) <= 3:
                for order in orders:
                    response_text += f"Order {order['id']}: ₹{order['total']}. "
            else:
                for order in orders[-3:]:
                    response_text += f"Order {order['id']}: ₹{order['total']}. "
        else:
            response_text = "You haven't placed any orders yet."
    
    # Default greeting
    else:
        response_text = "Hello! Welcome to our voice-powered store. You can browse products by saying things like 'Show me mugs' or 'I want a black hoodie'. Try using your voice or type below!"
    
    return jsonify({
        "response": response_text,
        "products": products_to_show
    })

@app.route('/api/orders', methods=['POST'])
def create_order():
    """ACP-style order creation endpoint"""
    data = request.json
    line_items = data.get('line_items', [])
    
    if not line_items:
        return jsonify({"error": "No items in order"}), 400
    
    order_id = str(uuid.uuid4())[:8]
    total = 0
    order_items = []
    
    for item in line_items:
        product = next((p for p in PRODUCTS if p['id'] == item['product_id']), None)
        if product:
            quantity = item.get('quantity', 1)
            order_items.append({
                "product_id": product['id'],
                "name": product['name'],
                "price": product['price'],
                "quantity": quantity,
                "image": product['image']
            })
            total += product['price'] * quantity
    
    order = {
        "id": order_id,
        "items": order_items,
        "total": total,
        "currency": "INR",
        "status": "CONFIRMED",
        "created_at": datetime.now().isoformat()
    }
    
    orders = load_orders()
    orders.append(order)
    save_orders(orders)
    
    return jsonify(order)

@app.route('/api/orders', methods=['GET'])
def get_orders():
    """Get all orders"""
    return jsonify(load_orders())

if __name__ == '__main__':
    app.run(debug=True, port=5000)