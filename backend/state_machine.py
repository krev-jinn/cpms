"""
CPMS State Machine
Strictly implements the State Transition Diagram from the authoritative CPMS documentation (Page 10).
"""

from typing import Tuple, Optional, List

# Complete set of 12 primary states from Page 10 of CPMS specification
STATES = [
    "Case Filed",
    "Under Verification",
    "Case Rejected",
    "Case Registered",
    "Judge Assigned",
    "Hearing Scheduled",
    "Hearing Rescheduled",
    "Hearing Conducted",
    "Evidence or Documents Upload",
    "Case Under Review",
    "Judgement Issued",
    "Case Closed"
]

# Transition rules: {current_state: {action_trigger: (next_state, allowed_roles)}}
TRANSITIONS = {
    "Case Filed": {
        "Submit for Verification": ("Under Verification", ["Lawyer", "Court Staff", "Admin"])
    },
    "Under Verification": {
        "Valid Case": ("Case Registered", ["Court Staff", "Admin"]),
        "Invalid/Incomplete": ("Case Rejected", ["Court Staff", "Admin"])
    },
    "Case Rejected": {
        "Resubmit Case": ("Under Verification", ["Lawyer", "Admin"])
    },
    "Case Registered": {
        "Assign Judge": ("Judge Assigned", ["Admin"])
    },
    "Judge Assigned": {
        "Schedule Hearing": ("Hearing Scheduled", ["Judge", "Court Staff", "Admin"])
    },
    "Hearing Scheduled": {
        "Reschedule": ("Hearing Rescheduled", ["Judge", "Admin"]),
        "Conduct Hearing": ("Hearing Conducted", ["Judge"]),
        "Issue Final Order": ("Judgement Issued", ["Judge"])
    },
    "Hearing Rescheduled": {
        "Reschedule": ("Hearing Rescheduled", ["Judge", "Admin"]),
        "Conduct Hearing": ("Hearing Conducted", ["Judge"]),
        "Issue Final Order": ("Judgement Issued", ["Judge"])
    },
    "Hearing Conducted": {
        "Next Hearing Required": ("Hearing Scheduled", ["Judge"]),
        "Additional Documents Required": ("Evidence or Documents Upload", ["Judge"]),
        "Proceed to Document Update": ("Evidence or Documents Upload", ["Lawyer"]),
        "Proceed to Review": ("Case Under Review", ["Judge"]),
        "Issue Final Order": ("Judgement Issued", ["Judge"])
    },
    "Evidence or Documents Upload": {
        "Documents Complete": ("Case Under Review", ["Judge", "Lawyer", "Court Staff"])
    },
    "Case Under Review": {
        "Issue Final Order": ("Judgement Issued", ["Judge"]),
        "Additional Documents Required": ("Evidence or Documents Upload", ["Judge"]),
        "Schedule Further Hearing": ("Hearing Scheduled", ["Judge"])
    },
    "Judgement Issued": {
        "Close Case": ("Case Closed", ["Admin", "Court Staff"])
    },
    "Case Closed": {}
}

def can_transition(current_state: str, trigger: str, user_role: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Checks if a transition from current_state via trigger by user_role is valid.
    Returns: (is_allowed, next_state, error_message)
    """
    if current_state not in TRANSITIONS:
        return False, None, f"Unknown current state: '{current_state}'"

    state_rules = TRANSITIONS[current_state]
    if trigger not in state_rules:
        available = list(state_rules.keys())
        return False, None, f"Invalid action '{trigger}' for state '{current_state}'. Valid actions: {available}"

    next_state, allowed_roles = state_rules[trigger]
    if user_role not in allowed_roles:
        return False, None, f"Role '{user_role}' is not authorized to perform '{trigger}'. Required roles: {allowed_roles}"

    return True, next_state, None

def get_available_actions(current_state: str, user_role: str) -> List[dict]:
    """
    Returns list of actions available for current state and user role.
    """
    if current_state not in TRANSITIONS:
        return []
    
    actions = []
    for trigger, (next_state, allowed_roles) in TRANSITIONS[current_state].items():
        if user_role in allowed_roles:
            actions.append({
                "trigger": trigger,
                "next_state": next_state,
                "allowed_roles": allowed_roles
            })
    return actions
