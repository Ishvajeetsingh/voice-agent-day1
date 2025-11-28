# app.py
import json
import random
import datetime
from flask import Flask, render_template, request, jsonify
import threading
import time
import os

app = Flask(__name__)
app.secret_key = 'grocery-voice-agent-ultra-premium'

# Load data
with open('catalog.json', 'r') as f:
    catalog = json.load(f)

with open('recipes.json', 'r') as f:
    recipes = json.load(f)

# Initialize data files
def initialize_data_files():
    if not os.path.exists('cart.json'):
        with open('cart.json', 'w') as f:
            json.dump({"items": [], "total": 0}, f)
    
    if not os.path.exists('orders_history.json'):
        with open('orders_history.json', 'w') as f:
            json.dump([], f)

initialize_data_files()

class VoiceAgent:
    def __init__(self):
        self.conversation_history = []
        self.current_order_id = None
        self.greeting_count = 0
    
    def process_message(self, user_input):
        user_input = user_input.lower().strip()
        response = ""
        action = None
        
        # Enhanced greetings with variety
        if any(word in user_input for word in ['hello', 'hi', 'hey', 'start', 'good morning', 'good afternoon']):
            greetings = [
                "🌟 Hey there! I'm your grocery assistant, ready to make your shopping experience amazing! What delicious items can I help you find today?",
                "🎉 Welcome back! I'm excited to help you with your grocery shopping. What would you like to add to your cart?",
                "🛒 Hello! Your personal shopping assistant is here! Whether you need quick snacks or ingredients for a fancy meal, I've got you covered!",
                "👋 Hi there! Ready to fill up your virtual cart? I'm here to help you find everything you need and more!",
                "🌈 Welcome! I'm your grocery genie 🧞♂️ - just tell me what you need and watch the magic happen!"
            ]
            response = random.choice(greetings)
        
        # View catalog
        elif 'what can i order' in user_input or 'catalog' in user_input or 'show items' in user_input:
            categories = set(item['category'] for item in catalog)
            response = f"📚 We have amazing items across {len(categories)} categories: {', '.join(categories)}. Feel free to browse or tell me what you're craving! 🍕"
        
        # Recipe-based ordering
        elif 'ingredients for' in user_input or 'make me' in user_input or 'i want to make' in user_input:
            response = self._handle_recipe_request(user_input)
        
        # Add specific item
        elif any(word in user_input for word in ['add', 'i want', 'get me', 'need', 'give me', 'i need', 'can i get']):
            response = self._handle_add_item(user_input)
        
        # View cart
        elif any(word in user_input for word in ['cart', 'what\'s in my cart', 'view cart', 'show cart', 'my cart']):
            response = self._get_cart_summary()
        
        # Remove item
        elif any(word in user_input for word in ['remove', 'delete', 'take out']):
            response = self._handle_remove_item(user_input)
        
        # Place order
        elif any(word in user_input for word in ['place order', 'checkout', 'done', 'finish', 'that\'s all', 'ready to checkout']):
            response, action = self._place_order()
        
        # Order tracking
        elif any(word in user_input for word in ['where is my order', 'order status', 'track', 'delivered', 'status']):
            response = self._get_order_status()
        
        # Thank you
        elif any(word in user_input for word in ['thank', 'thanks']):
            responses = [
                "🌟 You're absolutely welcome! It's my pleasure to help you shop. Is there anything else you need?",
                "😊 You're welcome! Happy to assist with your grocery needs. What's next on your list?",
                "🎉 My pleasure! I'm here whenever you need me. Your satisfaction makes my day!",
                "🌈 You're welcome! Remember, I'm always here to make your shopping experience wonderful!"
            ]
            response = random.choice(responses)
        
        # Help
        else:
            response = "🤔 I can help you: • 🛒 Add items to cart • 📋 View your cart • 🗑️ Remove items • ✅ Place orders • 📦 Track orders • 📖 Get recipe ingredients (try 'ingredients for pasta' 🍝)"
        
        self.conversation_history.append({
            'user': user_input,
            'agent': response,
            'timestamp': datetime.datetime.now().isoformat()
        })
        
        return response, action
    
    def _handle_recipe_request(self, user_input):
        cart = self._load_cart()
        added_items = []
        
        for recipe_name, ingredients in recipes.items():
            if recipe_name in user_input:
                for ingredient in ingredients:
                    matching_item = next((item for item in catalog if item['id'] == ingredient['id']), None)
                    if matching_item:
                        existing_item = next((ci for ci in cart['items'] if ci['id'] == matching_item['id']), None)
                        if existing_item:
                            existing_item['quantity'] += ingredient.get('quantity', 1)
                        else:
                            cart['items'].append({
                                **matching_item,
                                'quantity': ingredient.get('quantity', 1)
                            })
                        added_items.append(f"🍴 {matching_item['name']}")
                
                self._save_cart(cart)
                return f"👨‍🍳 Perfect! I've gathered everything you need for {recipe_name}: {', '.join(added_items)}. They're now in your cart! Ready to cook up something amazing! 🎉"
        
        available_recipes = ", ".join([f"'{r}'" for r in recipes.keys()])
        return f"📖 I can help you with these delicious recipes: {available_recipes}. Just say 'ingredients for [recipe name]' and I'll work my magic! ✨"
    
    def _handle_add_item(self, user_input):
        cart = self._load_cart()
        added_items = []
        
        for item in catalog:
            if any(word in user_input for word in item['name'].lower().split()):
                quantity = 1
                words = user_input.split()
                for i, word in enumerate(words):
                    if word.isdigit() and i < len(words) - 1:
                        quantity = int(word)
                        break
                
                existing_item = next((ci for ci in cart['items'] if ci['id'] == item['id']), None)
                if existing_item:
                    existing_item['quantity'] += quantity
                else:
                    cart['items'].append({
                        **item,
                        'quantity': quantity
                    })
                added_items.append(f"🛒 {quantity} x {item['name']}")
                break
        
        if added_items:
            self._save_cart(cart)
            responses = [
                f"✅ Awesome! I've added to your cart: {', '.join(added_items)}. Your cart total is now ₹{cart['total']}. Keep the goodies coming! 🎊",
                f"🎯 Perfect choice! {', '.join(added_items)} are now in your cart. Total: ₹{cart['total']}. What's next? 🌟",
                f"✨ Excellent! {', '.join(added_items)} have been added. Your cart total: ₹{cart['total']}. Your shopping cart is looking great! 🛍️"
            ]
            return random.choice(responses)
        else:
            sample_items = random.sample([item['name'] for item in catalog], 3)
            return f"🤷 I couldn't find that item. No worries! Try something like 'add {sample_items[0]}' or 'get me {sample_items[1]}'. You can also click items in the catalog! 📚"
    
    def _handle_remove_item(self, user_input):
        cart = self._load_cart()
        removed_items = []
        
        for item in catalog:
            if any(word in user_input for word in item['name'].lower().split()):
                cart['items'] = [ci for ci in cart['items'] if ci['id'] != item['id']]
                removed_items.append(f"❌ {item['name']}")
        
        if removed_items:
            self._save_cart(cart)
            return f"🗑️ Got it! I've removed from your cart: {', '.join(removed_items)}. Your cart has been updated! 🔄"
        else:
            return "🤔 I couldn't find that item in your cart. Here's what's currently in your cart: " + self._get_cart_summary()
    
    def _get_cart_summary(self):
        cart = self._load_cart()
        if not cart['items']:
            return "🛒 Your cart is looking a bit empty! Let's fill it up with some amazing goodies! What would you like to add? 🌈"
        
        items_text = []
        for item in cart['items']:
            items_text.append(f"📦 {item['quantity']} x {item['name']} - ₹{item['price'] * item['quantity']}")
        
        total = sum(item['price'] * item['quantity'] for item in cart['items'])
        
        cart_responses = [
            f"🛒 Your shopping cart is looking great! Here's what you have: {', '.join(items_text)}. 🎯 Total: ₹{total}. Ready to checkout? 🚀",
            f"📋 Cart summary: {', '.join(items_text)}. 💰 Total: ₹{total}. Almost there! Say 'place order' when you're ready! ✅",
            f"🎊 Amazing selections! Your cart contains: {', '.join(items_text)}. 💎 Total: ₹{total}. Ready to complete your order? 🌟"
        ]
        
        return random.choice(cart_responses)
    
    def _place_order(self):
        cart = self._load_cart()
        if not cart['items']:
            return "🛒 Your cart is empty! Let's add some delicious items first. Try 'add milk' or 'get me bread' - I know you'll find something amazing! 🌈", None
        
        total = sum(item['price'] * item['quantity'] for item in cart['items'])
        order_id = f"ORD{random.randint(1000, 9999)}"
        
        order = {
            "order_id": order_id,
            "timestamp": datetime.datetime.now().isoformat(),
            "items": cart['items'].copy(),
            "total": total,
            "status": "received"
        }
        
        with open('order.json', 'w') as f:
            json.dump(order, f, indent=2)
        
        with open('orders_history.json', 'r') as f:
            orders_history = json.load(f)
        orders_history.append(order)
        with open('orders_history.json', 'w') as f:
            json.dump(orders_history, f, indent=2)
        
        cart['items'] = []
        cart['total'] = 0
        self._save_cart(cart)
        
        self.current_order_id = order_id
        
        order_responses = [
            f"🎉 CONGRATULATIONS! Your order #{order_id} has been placed successfully! 🚀 Total: ₹{total}. You can track your order anytime by asking 'where is my order?' 📦 We're excited to get your items to you!",
            f"🌟 FANTASTIC! Order #{order_id} is confirmed! 💰 Total: ₹{total}. Your groceries are on their way to being prepared! Track progress with 'order status' 📊",
            f"✅ ORDER PLACED! 🎊 Your order #{order_id} is being processed. Total: ₹{total}. We'll keep you updated every step of the way! Say 'track my order' anytime 📦"
        ]
        
        response = random.choice(order_responses)
        return response, "order_placed"
    
    def _get_order_status(self):
        try:
            with open('orders_history.json', 'r') as f:
                orders = json.load(f)
            
            if not orders:
                return "📦 You haven't placed any orders yet. But I'm excited to help you create your first order! 🛒 What would you like to add to your cart? 🌟"
            
            latest_order = orders[-1]
            status = latest_order['status']
            order_id = latest_order['order_id']
            total = latest_order['total']
            
            status_messages = {
                "received": "📥 We've received your order and our team is preparing it with care! Should be confirmed very soon! ⏳",
                "confirmed": "✅ Your order has been confirmed and is being processed! Our team is hand-picking your items! 👨‍🍳",
                "being_prepared": "👨‍🍳 Our expert team is carefully preparing your groceries for delivery! Everything's looking fresh and perfect! 🌱",
                "out_for_delivery": "🚚 EXCITING NEWS! Your order is out for delivery! Should arrive at your doorstep soon! 🎊",
                "delivered": "🎉 DELIVERED! Your order has been successfully delivered. Thank you for shopping with us! We can't wait to serve you again! 🌈"
            }
            
            items_count = len(latest_order['items'])
            return f"📦 Order #{order_id} ({items_count} items, ₹{total}): {status_messages.get(status, status)}"
        
        except FileNotFoundError:
            return "📦 You haven't placed any orders yet. But that's okay - every great shopping journey starts with a first order! 🛒 What would you like to add? 🌟"
    
    def _load_cart(self):
        try:
            with open('cart.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"items": [], "total": 0}
    
    def _save_cart(self, cart):
        cart['total'] = sum(item['price'] * item['quantity'] for item in cart['items'])
        with open('cart.json', 'w') as f:
            json.dump(cart, f, indent=2)

def start_status_updater():
    def update_statuses():
        while True:
            time.sleep(30)
            try:
                with open('orders_history.json', 'r') as f:
                    orders = json.load(f)
                
                status_flow = ["received", "confirmed", "being_prepared", "out_for_delivery", "delivered"]
                
                for order in orders:
                    if order['status'] != "delivered":
                        current_index = status_flow.index(order['status'])
                        if current_index < len(status_flow) - 1:
                            order['status'] = status_flow[current_index + 1]
                
                with open('orders_history.json', 'w') as f:
                    json.dump(orders, f, indent=2)
                
            except Exception as e:
                print(f"Error updating statuses: {e}")
    
    thread = threading.Thread(target=update_statuses, daemon=True)
    thread.start()

start_status_updater()

agent = VoiceAgent()

@app.route('/')
def index():
    return render_template('index.html', catalog=catalog)

@app.route('/api/message', methods=['POST'])
def handle_message():
    data = request.json
    user_input = data.get('message', '')
    
    response, action = agent.process_message(user_input)
    cart = agent._load_cart()
    
    return jsonify({
        'response': response,
        'action': action,
        'cart': cart
    })

@app.route('/api/cart', methods=['GET'])
def get_cart():
    cart = agent._load_cart()
    return jsonify(cart)

@app.route('/api/orders/current', methods=['GET'])
def get_current_order():
    try:
        with open('order.json', 'r') as f:
            order = json.load(f)
        return jsonify(order)
    except FileNotFoundError:
        return jsonify({"error": "No current order"})

@app.route('/api/status/update', methods=['POST'])
def manual_status_update():
    try:
        with open('orders_history.json', 'r') as f:
            orders = json.load(f)
        
        if orders:
            latest_order = orders[-1]
            status_flow = ["received", "confirmed", "being_prepared", "out_for_delivery", "delivered"]
            current_index = status_flow.index(latest_order['status'])
            if current_index < len(status_flow) - 1:
                latest_order['status'] = status_flow[current_index + 1]
            
            with open('orders_history.json', 'w') as f:
                json.dump(orders, f, indent=2)
            
            return jsonify({"success": True, "new_status": latest_order['status']})
    
    except Exception as e:
        return jsonify({"error": str(e)})
    
    return jsonify({"error": "No orders to update"})

if __name__ == '__main__':
    print("🚀 Ultra Premium Grocery Voice Agent starting...")
    print("📱 Open http://localhost:5000")
    app.run(debug=True, port=5000)