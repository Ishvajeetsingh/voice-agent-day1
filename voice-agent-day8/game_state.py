import json
from datetime import datetime

class GameState:
    def __init__(self):
        self.state = {
            "player": {
                "name": "Adventurer",
                "class": "Wanderer",
                "hp": 100,
                "max_hp": 100,
                "status": "Healthy",
                "inventory": ["torch", "waterskin", "rusty dagger"],
                "gold": 25,
                "level": 1,
                "traits": ["brave", "curious"]
            },
            "location": {
                "name": "Ancient Forest Entrance",
                "description": "A misty forest with towering trees and mysterious sounds",
                "visited": True,
                "connections": ["deeper_forest", "village"]
            },
            "npcs": [
                {
                    "name": "Elder Thorne",
                    "role": "Village Elder",
                    "attitude": "friendly",
                    "alive": True,
                    "location": "village",
                    "met": False
                }
            ],
            "events": [
                {
                    "timestamp": datetime.now().isoformat(),
                    "description": "Adventure begins at the Ancient Forest entrance",
                    "importance": "major"
                }
            ],
            "quests": [
                {
                    "name": "Investigate the Forest",
                    "description": "Explore the mysterious sounds coming from the Ancient Forest",
                    "status": "active",
                    "objectives": [
                        {"task": "Enter the forest", "completed": False},
                        {"task": "Find the source of the sounds", "completed": False}
                    ]
                }
            ],
            "world_info": {
                "universe": "Dark Fantasy",
                "danger_level": "moderate",
                "time_of_day": "dusk",
                "weather": "misty"
            }
        }
    
    def get_state(self):
        return json.dumps(self.state, indent=2)
    
    def get_state_dict(self):
        return self.state
    
    def update_state(self, updates):
        """Update specific parts of the state"""
        try:
            if "player" in updates and isinstance(updates["player"], dict):
                self.state["player"].update(updates["player"])
            
            if "location" in updates and isinstance(updates["location"], dict):
                self.state["location"].update(updates["location"])
            
            if "npcs" in updates:
                if isinstance(updates["npcs"], list):
                    for updated_npc in updates["npcs"]:
                        if isinstance(updated_npc, dict):
                            found = False
                            for npc in self.state["npcs"]:
                                if npc.get("name") == updated_npc.get("name"):
                                    npc.update(updated_npc)
                                    found = True
                                    break
                            if not found:
                                self.state["npcs"].append(updated_npc)
            
            if "events" in updates:
                if isinstance(updates["events"], list):
                    self.state["events"].extend(updates["events"])
                elif isinstance(updates["events"], dict):
                    self.state["events"].append(updates["events"])
            
            if "quests" in updates:
                if isinstance(updates["quests"], list):
                    for updated_quest in updates["quests"]:
                        if isinstance(updated_quest, dict):
                            found = False
                            for quest in self.state["quests"]:
                                if quest.get("name") == updated_quest.get("name"):
                                    quest.update(updated_quest)
                                    found = True
                                    break
                            if not found:
                                self.state["quests"].append(updated_quest)
            
            if "world_info" in updates and isinstance(updates["world_info"], dict):
                self.state["world_info"].update(updates["world_info"])
        except Exception as e:
            print(f"Error updating state: {e}")
            # Continue without crashing
    
    def add_event(self, description, importance="minor"):
        event = {
            "timestamp": datetime.now().isoformat(),
            "description": description,
            "importance": importance
        }
        self.state["events"].append(event)
    
    def get_character_sheet(self):
        player = self.state["player"]
        return {
            "name": player["name"],
            "class": player["class"],
            "level": player["level"],
            "hp": f"{player['hp']}/{player['max_hp']}",
            "status": player["status"],
            "gold": player["gold"],
            "inventory": player["inventory"],
            "traits": player["traits"]
        }
    
    def get_active_quests(self):
        return [q for q in self.state["quests"] if q["status"] == "active"]
    
    def get_summary(self):
        """Get a concise summary for the LLM"""
        player = self.state["player"]
        location = self.state["location"]
        active_quests = self.get_active_quests()
        recent_events = self.state["events"][-3:] if len(self.state["events"]) > 0 else []
        
        summary = f"""
CURRENT GAME STATE:
Player: {player['name']} (Level {player['level']} {player['class']})
HP: {player['hp']}/{player['max_hp']} | Status: {player['status']}
Gold: {player['gold']} | Inventory: {', '.join(player['inventory'])}

Location: {location['name']}
Description: {location['description']}

Active Quests: {len(active_quests)}
"""
        if active_quests:
            for quest in active_quests:
                summary += f"\n- {quest['name']}: {quest['description']}"
        
        if recent_events:
            summary += f"\n\nRecent Events:"
            for event in recent_events:
                summary += f"\n- {event['description']}"
        
        return summary.strip()