import sys
import json
import logging
import os
from dotenv import load_dotenv # For API keys

# Attempt to import Agent-S components
try:
    from gui_agents.s2.agents.agent_s import AgentS2
    from gui_agents.s2.agents.grounding import OSWorldACI, ACI # OSWorldACI might be too specific, ACI is more general
    from gui_agents.s2.utils.helpers import load_engine_params
    AGENT_S_AVAILABLE = True
except ImportError as e:
    logging.error(f"Failed to import Agent-S components: {e}. Agent-S functionality will be disabled.")
    AGENT_S_AVAILABLE = False
    AgentS2 = None
    OSWorldACI = None
    ACI = None
    load_engine_params = None

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s][%(levelname)s][PythonWrapper] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout) # Ensure logs go to stdout for Electron to capture
    ]
)

# Load environment variables from a .env file if present (especially for API keys)
load_dotenv()

class AgentWrapper:
    def __init__(self):
        self.agent = None
        if AGENT_S_AVAILABLE:
            try:
                # Configuration (these would ideally come from a config file or env vars)
                # User will provide Gemini key. Agent-S can use various models.
                # For now, let's assume OpenAI is a common default or can be configured.
                # The user's Gemini key will be used by Agent-S if it's configured to use Gemini.

                # Primary LLM engine (e.g., for planning, reasoning)
                # This is a simplified example; Agent-S has more sophisticated ways to load models
                # and often uses specific models for grounding vs. generation.
                # We'll use environment variables for API keys as a common practice.
                # OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY (for Gemini) etc.

                # Default to a provider that might be easily set up with an API key
                # User mentioned Gemini, so let's try to configure for that primarily if simple
                # or fall back to OpenAI as it's common in Agent-S examples.

                # Let's try to use the load_engine_params from Agent-S if available
                # This expects env vars like OPENAI_API_KEY or ANTHROPIC_API_KEY to be set.
                # The user will provide a GEMINI_API_KEY. Agent-S might need specific env var names.
                # For Agent-S, Gemini might be used via 'google' provider.
                # Let's assume GOOGLE_API_KEY for Gemini as an example, or specific provider setup.

                # Simplified engine_params for now. Real setup depends on Agent-S version and model choice.
                # Agent-S's `load_engine_params` or direct instantiation might be better.
                # The key is that Agent-S internally handles the LLM calls using the provided API keys.

                # Example using environment variables for API keys
                # These should be set in the environment where this Python script runs.
                # Electron main process can pass these through when spawning.
                engine_params = {
                    "engine_type": os.getenv("AGENT_S_ENGINE_TYPE", "google"), # Default to google (Gemini)
                    "model": os.getenv("AGENT_S_MODEL", "gemini-pro"), # Example model
                    "api_key": os.getenv("GOOGLE_API_KEY") # User will provide this
                }
                if not engine_params["api_key"] and engine_params["engine_type"] == "google":
                     engine_params = { # Fallback if GOOGLE_API_KEY is not set
                        "engine_type": os.getenv("AGENT_S_FALLBACK_ENGINE_TYPE", "openai"),
                        "model": os.getenv("AGENT_S_FALLBACK_MODEL", "gpt-3.5-turbo"),
                        "api_key": os.getenv("OPENAI_API_KEY")
                     }


                # Grounding agent setup (simplified)
                # For a chat app, detailed visual grounding might not be the first priority,
                # but ACI is fundamental.
                # We might need a more generic ACI or one suited for macOS.
                # OSWorldACI is specific to that benchmark environment.
                # Let's try a more general ACI or a simplified grounding if possible.
                # For now, we might not need complex visual grounding for basic chat.
                # ACI might be sufficient.

                # A more robust way would be to use Agent-S's config loading if available.
                # For now, let's assume a basic ACI for macOS.
                # The `platform` parameter is crucial.
                # The `engine_params_for_grounding` can often be the same as main engine or specialized.

                grounding_agent_instance = ACI(
                    platform="darwin", # For macOS
                    engine_params_for_generation=engine_params, # Can be same or different
                    engine_params_for_grounding=engine_params # Can be same or different
                )

                self.agent = AgentS2(
                    engine_params=engine_params,
                    grounding_agent=grounding_agent_instance,
                    platform="darwin", # macOS
                    action_space="pyautogui", # Default, can be extended
                    observation_type="screenshot", # Default, can be extended
                    # search_engine="Perplexica", # Optional, requires setup
                    # embedding_engine_type="openai" # Optional
                )
                logging.info("Agent-S initialized successfully.")
            except Exception as e:
                logging.error(f"Failed to initialize Agent-S: {e}", exc_info=True)
                self.agent = None # Ensure agent is None if init fails

    def process_command(self, command_message):
        if not self.agent:
            return {
                "status": "error",
                "error_message": "Agent-S is not initialized or failed to initialize.",
                "original_command": command_message
            }

        try:
            command_type = command_message.get("type")
            payload = command_message.get("payload")
            logging.info(f"Processing command: {command_type} with payload: {payload}")

            if command_type == "user_chat":
                user_text = str(payload) # Ensure payload is treated as string
                if user_text.lower().startswith("playwright:"):
                    try:
                        # Assumes the text after "playwright:" is a JSON string for the task
                        # e.g., playwright: {"action": "goto", "url": "https://example.com"}
                        task_json_str = user_text[len("playwright:"):].strip()
                        playwright_task_payload = json.loads(task_json_str)
                        # Construct a message as if it came directly for execute_playwright_task
                        playwright_message = {
                            "type": "execute_playwright_task",
                            "payload": { # Default browser to chromium if not specified
                                "browser": playwright_task_payload.get("browser", "chromium"),
                                "task": playwright_task_payload # The actual task details
                            }
                        }
                        return self.process_command(playwright_message) # Recursively call to handle it
                    except json.JSONDecodeError:
                        logging.error(f"Playwright command from user_chat is not valid JSON: {task_json_str}")
                        return {"status": "error", "error_message": "Invalid JSON format for Playwright command."}
                    except Exception as e:
                        logging.error(f"Error parsing Playwright command from user_chat: {e}")
                        return {"status": "error", "error_message": f"Error parsing Playwright command: {str(e)}"}
                else:
                    # Default user_chat to echo if not a playwright command
                    return {
                        "status": "success",
                        "type": "echo_response",
                        "message": f"Agent-S echoes: {user_text}"
                    }

            elif command_type == "echo":
                return {
                    "status": "success",
                    "type": "echo_response",
                    "message": f"Agent-S echoes: {payload}"
                }
            elif command_type == "simple_query": # This will now simulate a plan
                instruction_text = str(payload.get("text", payload)) # Allow raw string payload too
                logging.info(f"Agent-S received instruction for planning: {instruction_text}")

                # Simulate Agent-S planning process for a complex task
                # In a real scenario, this would be:
                # obs = self.agent.grounding_agent.create_observation() # Or some relevant observation
                # plan_and_first_action = self.agent.predict(instruction=instruction_text, observation=obs)
                # For now, we mock this.

                if "plan a trip" in instruction_text.lower():
                    thought = "Okay, planning a trip involves several steps: finding flights, booking a hotel, and planning activities."
                    todo_list = [
                        {"id": "flight", "description": "Find flights to destination", "status": "pending"},
                        {"id": "hotel", "description": "Book hotel", "status": "pending"},
                        {"id": "activities", "description": "Plan activities", "status": "pending"}
                    ]
                    response_text = "I've created a plan for your trip."
                elif "write code for fibonacci" in instruction_text.lower():
                    thought = "To write code for Fibonacci, I need to define the function, handle base cases, and implement the recursion or iteration."
                    todo_list = [
                        {"id": "func_def", "description": "Define Fibonacci function signature", "status": "pending"},
                        {"id": "base_cases", "description": "Implement base cases (n=0, n=1)", "status": "pending"},
                        {"id": "recursive_step", "description": "Implement recursive/iterative step", "status": "pending"},
                        {"id": "test_code", "description": "Test the function", "status": "pending"}
                    ]
                    response_text = "Here's the plan to code the Fibonacci sequence."
                else:
                    thought = f"I've processed your query: '{instruction_text}'. I would normally create a detailed plan here if it were a complex task."
                    todo_list = [{"id": "gen_task_1", "description": f"Process query: {instruction_text}", "status": "pending"}]
                    response_text = f"Agent-S received your query. If it were complex, a plan would appear here."

                return {
                    "status": "success",
                    "type": "agent_plan_response", # New response type
                    "thought": thought,
                    "todo_list": todo_list,
                    "message": response_text, # General message
                    "overall_status": "planning_complete"
                }

            elif command_type == "simulate_task_completion": # New command type for testing UI updates
                original_todo_list = payload.get("todo_list", [])
                task_id_to_complete = payload.get("task_id")

                updated_todo_list = []
                task_completed_message = "No specific task updated."

                if not original_todo_list or not task_id_to_complete:
                    return {"status": "error", "error_message": "Missing todo_list or task_id for simulation"}

                for task in original_todo_list:
                    if task.get("id") == task_id_to_complete:
                        updated_task = {**task, "status": "completed"}
                        updated_todo_list.append(updated_task)
                        task_completed_message = f"Task '{task.get('description')}' marked as completed."
                    else:
                        updated_todo_list.append(task)

                # Check if all tasks are completed
                all_done = all(task.get("status") == "completed" for task in updated_todo_list)
                overall_status = "plan_executed_successfully" if all_done else "executing_plan"

                return {
                    "status": "success",
                    "type": "agent_plan_response", # Re-use same type for UI to update the plan
                    "todo_list": updated_todo_list,
                    "message": task_completed_message,
                    "overall_status": overall_status
                }

            elif command_type == "process_screenshot":
                image_path = payload.get("image_path")
                if not image_path or not os.path.exists(image_path):
                    logging.error(f"Screenshot path invalid or not found: {image_path}")
                    return {
                        "status": "error",
                        "error_message": f"Invalid image path: {image_path}",
                        "original_command": command_message
                    }

                logging.info(f"Agent-S processing screenshot: {image_path}")
                # In a real scenario, AgentS2.predict() would be used with an observation containing the screenshot.
                # obs = {"screenshot": image_bytes_or_path, "task": "Analyze this screenshot"}
                # For now, this is a conceptual placeholder.
                # The actual implementation depends on how AgentS2 consumes screenshots for general analysis.
                # It might involve reading the image, then passing bytes or using a specific method.

                # Let's assume a method like `self.agent.analyze_image(image_path)` exists or we use predict.
                # For this step, we'll simulate the analysis.
                # A true call might be: response_text, action = self.agent.predict(instruction="Describe this image.", observation={"screenshot_path": image_path})

                # Simulate Agent-S response for screenshot
                try:
                    # This is where you'd call agent.predict or a similar method
                    # For example:
                    # with open(image_path, "rb") as img_file:
                    #     img_bytes = img_file.read()
                    # obs = {"screenshot": img_bytes, "available_tools": ["text_recognition"]} # Example observation
                    # instruction = "Analyze this image and describe what you see. Extract any text."
                    # agent_response_data = self.agent.predict(instruction=instruction, observation=obs)
                    # description = agent_response_data.get("description", "No description available")
                    # extracted_text = agent_response_data.get("text", "No text extracted")
                    # response_text = f"Image analysis: {description}. Extracted text: {extracted_text}"

                    # Placeholder response since direct predict call is complex here:
                    response_text = f"Agent-S received screenshot: {os.path.basename(image_path)}. Analysis would occur using Agent-S vision capabilities."
                    logging.info(f"Agent-S simulated analysis for {image_path}: {response_text}")

                    return {
                        "status": "success",
                        "type": "screenshot_analysis_response",
                        "original_path": image_path,
                        "analysis_result": response_text,
                        "actions_planned": [] # Placeholder for actions Agent-S might decide
                    }
                except Exception as e:
                    logging.error(f"Agent-S error during screenshot processing: {e}", exc_info=True)
                    return {
                        "status": "error",
                        "error_message": f"Agent-S failed to process screenshot: {str(e)}",
                        "original_command": command_message
                    }
            elif command_type == "process_audio_base64":
                audio_data = payload.get("data")
                mime_type = payload.get("mimeType")
                if not audio_data or not mime_type:
                    return {"status": "error", "error_message": "Missing audio data or mimeType"}

                logging.info(f"Agent-S processing base64 audio, mimeType: {mime_type}")
                # obs = {"audio_base64": audio_data, "mime_type": mime_type}
                # instruction = "Analyze this audio and provide a summary or transcription."
                # agent_response_data = self.agent.predict(instruction=instruction, observation=obs)
                # response_text = agent_response_data.get("text", "Audio processed by Agent-S.")

                # Placeholder:
                response_text = f"Agent-S received base64 audio. Analysis would occur here."
                return {
                    "status": "success",
                    "type": "audio_analysis_response",
                    "analysis_result": response_text
                }

            elif command_type == "process_audio_file":
                audio_path = payload.get("path")
                if not audio_path or not os.path.exists(audio_path):
                    return {"status": "error", "error_message": f"Invalid audio path: {audio_path}"}

                logging.info(f"Agent-S processing audio file: {audio_path}")
                # obs = {"audio_path": audio_path}
                # instruction = "Analyze this audio file and provide a summary or transcription."
                # agent_response_data = self.agent.predict(instruction=instruction, observation=obs)
                # response_text = agent_response_data.get("text", "Audio file processed by Agent-S.")

                # Placeholder:
                response_text = f"Agent-S received audio file: {os.path.basename(audio_path)}. Analysis would occur here."
                return {
                    "status": "success",
                    "type": "audio_analysis_response",
                    "original_path": audio_path,
                    "analysis_result": response_text
                }
            elif command_type == "analyze_single_image": # New handler
                image_path = payload.get("path")
                if not image_path or not os.path.exists(image_path):
                    return {"status": "error", "error_message": f"Invalid image path for single analysis: {image_path}"}

                logging.info(f"Agent-S analyzing single image: {image_path}")
                # Placeholder logic, similar to process_screenshot but perhaps with a more generic instruction
                # instruction = "Describe this image and suggest possible actions."
                # obs = {"screenshot_path": image_path} # Or image_bytes
                # agent_response_data = self.agent.predict(instruction=instruction, observation=obs)
                # response_text = agent_response_data.get("description", "Image analyzed by Agent-S.")

                response_text = f"Agent-S received single image: {os.path.basename(image_path)}. General analysis would occur."
                return {
                    "status": "success",
                    "type": "single_image_analysis_response",
                    "original_path": image_path,
                    "analysis_result": response_text # This should match what analyzeImageFile in LLMHelper returned: {text, timestamp}
                }

            elif command_type == "execute_playwright_task":
                if not AGENT_S_AVAILABLE: # Should also check if Playwright is available, but it's installed with Agent-S usually
                     return {"status": "error", "error_message": "Agent-S (and Playwright) components not available."}

                task_details = payload.get("task")
                browser_type = payload.get("browser", "chromium") # Default to chromium

                logging.info(f"Agent-S attempting Playwright task: {task_details} with browser: {browser_type}")

                try:
                    from playwright.sync_api import sync_playwright, Error as PlaywrightError

                    with sync_playwright() as p:
                        browser = None
                        if browser_type == "chromium":
                            browser = p.chromium.launch(headless=False) # Launch headed for visibility during dev
                        elif browser_type == "firefox":
                            browser = p.firefox.launch(headless=False)
                        elif browser_type == "webkit":
                            browser = p.webkit.launch(headless=False)
                        else:
                            return {"status": "error", "error_message": f"Unsupported browser for Playwright: {browser_type}"}

                        context = browser.new_context()
                        page = context.new_page()
                        action_result = "No action performed."

                        if task_details.get("action") == "goto":
                            url = task_details.get("url")
                            if not url:
                                return {"status": "error", "error_message": "URL missing for Playwright goto action"}
                            page.goto(url, timeout=60000) # 60s timeout
                            action_result = f"Navigated to {url}. Page title: {page.title()}"
                            # Optionally take a screenshot
                            # screenshot_path = f"playwright_screenshot_{Date.now()}.png"
                            # page.screenshot(path=screenshot_path)
                            # action_result += f". Screenshot taken: {screenshot_path}"

                        elif task_details.get("action") == "get_title":
                            action_result = f"Current page title: {page.title()}"

                        # Add more actions here: click, fill, screenshot, etc.

                        else:
                            action_result = f"Unknown Playwright action: {task_details.get('action')}"
                            browser.close()
                            return {"status": "error", "error_message": action_result}

                        browser.close()
                        logging.info(f"Playwright task completed. Result: {action_result}")
                        return {
                            "status": "success",
                            "type": "playwright_task_response",
                            "result": action_result
                        }
                except PlaywrightError as e:
                    logging.error(f"Playwright execution error: {e}", exc_info=True)
                    return {"status": "error", "error_message": f"Playwright error: {str(e)}"}
                except Exception as e:
                    logging.error(f"General error during Playwright task: {e}", exc_info=True)
                    return {"status": "error", "error_message": f"Error during Playwright task: {str(e)}"}

            # TODO: Add more command handlers (playwright_task etc.)

            else:
                return {
                    "status": "error",
                    "error_message": f"Unknown command type: {command_type}",
                    "original_command": command_message
                }

        except Exception as e:
            logging.error(f"Error processing command in Agent-S: {e}", exc_info=True)
            return {
                "status": "error",
                "error_message": f"Agent-S failed to process command: {str(e)}",
                "original_command": command_message
            }


def main():
    logging.info("Agent-S Wrapper V2 started.")
    agent_wrapper = AgentWrapper()

    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue

            logging.info(f"Received raw line: {line}")
            try:
                message = json.loads(line)
                logging.info(f"Received message: {message}")

                if agent_wrapper:
                    response = agent_wrapper.process_command(message)
                else:
                    # Fallback if AgentWrapper itself failed to init (though constructor handles AgentS2 init failure)
                    response = {
                        "status": "error",
                        "error_message": "AgentWrapper not available.",
                        "original_message": message
                    }

            except json.JSONDecodeError as e:
                logging.error(f"JSONDecodeError: {e} for line: {line}", exc_info=True)
                response = {
                    "status": "error",
                    "error_message": f"Invalid JSON received: {line}",
                    "details": str(e)
                }
            except Exception as e:
                logging.error(f"Unexpected error processing message: {e}", exc_info=True)
                response = {
                    "status": "error",
                    "error_message": "An unexpected error occurred in Python wrapper",
                    "details": str(e)
                }

            # Send response back to Node.js
            try:
                json_response = json.dumps(response)
                sys.stdout.write(json_response + "\n") # Ensure newline for flushing and parsing
                sys.stdout.flush()
                logging.info(f"Sent response: {json_response}")
            except Exception as e:
                logging.critical(f"Could not serialize response {response}: {e}", exc_info=True)
                fallback_error = json.dumps({
                    "status": "error",
                    "error_message": "Python wrapper critical error: Could not serialize response.",
                    "original_serialization_error": str(e)
                })
                sys.stdout.write(fallback_error + "\n")
                sys.stdout.flush()

    except KeyboardInterrupt:
        logging.info("Python script interrupted by user (KeyboardInterrupt).")
    except BrokenPipeError:
        logging.info("Python script stdin/stdout pipe was broken (e.g. Node.js process closed).")
    except Exception as e:
        logging.critical(f"Critical error in Python script main loop: {e}", exc_info=True)
    finally:
        logging.info("Python script shutting down.")

if __name__ == "__main__":
    main()
