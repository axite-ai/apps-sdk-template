# MCP Design Philosophy: Building Great ChatGPT Apps

This guide outlines the design principles for building effective MCP (Model Context Protocol) applications for ChatGPT. Based on OpenAI's "What makes a great ChatGPT app" guidance and MCP best practices.

## Table of Contents

1. [What is a ChatGPT App?](#what-is-a-chatgpt-app)
2. [The Know/Do/Show Framework](#the-knowdoshow-framework)
3. [Capability Selection](#capability-selection)
4. [Conversation Design](#conversation-design)
5. [Ecosystem Design](#ecosystem-design)
6. [Building for Model + User](#building-for-model--user)

---

## What is a ChatGPT App?

A ChatGPT app is **not** a miniature version of your product. It's a set of well-defined tools that give ChatGPT specific powers:

- **Capabilities** the model can call for context and visual engagement
- **Tools** that show up inside ongoing conversations
- **Operations** the model can orchestrate alongside other apps

### The Mindset Shift

| Traditional App | ChatGPT App |
|-----------------|-------------|
| Users open your app intentionally | Model invokes your tools when relevant |
| You own the entire screen | You provide capabilities in a flow |
| Full navigation hierarchy | A few focused operations |
| Users learn your UI patterns | Model decides when to use you |

**Key principle**: Your ChatGPT app is a toolkit the model reaches for when users encounter specific problems. The more precisely defined, the easier it is to use.

---

## The Know/Do/Show Framework

Every tool should clearly add value in at least one of these dimensions:

### KNOW: Provide New Context

Give ChatGPT information it couldn't access otherwise:

| Category | Examples |
|----------|----------|
| Real-time data | Live prices, availability, weather |
| User-specific | Account data, preferences, history |
| Private/gated | Internal metrics, subscription content |
| Domain knowledge | Specialized calculations, recommendations |

**Template examples:**
- `get_user_items` - User's private data from your database
- `get_weather` - Real-time external data

### DO: Take Actions

Let ChatGPT act on the user's behalf:

| Category | Examples |
|----------|----------|
| CRUD | Create, update, delete records |
| External integrations | Send emails, trigger webhooks |
| Transactions | Payments, bookings, subscriptions |
| Workflows | Multi-step processes |

**Template examples:**
- `manage_item` - Create/update/delete items
- `manage_subscription` - Access Stripe billing portal

### SHOW: Better Visualization

Present information in ways plain text cannot:

| Category | Examples |
|----------|----------|
| Data displays | Tables, charts, comparisons |
| Interactive forms | Input collection with validation |
| Rich media | Images, maps, timelines |
| Custom views | Domain-specific visualizations |

**Template examples:**
- `user-items` widget - Interactive list with actions
- `roi-calculator` widget - Chart + year-by-year table

### Self-Check

For each tool you build, ask:
- [ ] Does it KNOW something ChatGPT can't?
- [ ] Does it DO something ChatGPT can't?
- [ ] Does it SHOW something better than text?

If none apply, reconsider whether the tool adds value.

---

## Capability Selection

### Don't Port Your Product

Resist listing all features and asking "how do we bring these to ChatGPT?" This creates a fuzzy surface area that's hard for the model to navigate.

### The Jobs-to-be-Done Approach

1. **List core jobs**: What outcomes do users want?
   - "Help me track my items"
   - "Show me investment projections"
   - "Check the weather before going out"

2. **Find the gaps**: Where does base ChatGPT fall short?
   - Can't access your database
   - Can't perform calculations with your data
   - Can't show interactive visualizations

3. **Define focused operations**: Turn gaps into clearly named tools
   - `get_user_items` (not `full_item_management_system`)
   - `calculate_roi` (not `financial_planning_suite`)

### Naming for Clarity

Good tool names are:
- **Action-oriented**: `create_item`, `get_weather`, `calculate_roi`
- **Predictable**: `{service}_action_resource` pattern
- **Self-documenting**: The name tells you what it does

| Good | Bad |
|------|-----|
| `get_user_items` | `items` |
| `create_item` | `item_manager` |
| `calculate_roi` | `finance` |

---

## Conversation Design

### Handling Vague Intent

> "Help me organize my stuff"

A good response:
- Uses available context (current items, recent activity)
- Asks minimal clarifying questions
- Shows something useful immediately

Don't:
- Force a 5-question onboarding flow
- Require detailed parameters before showing anything
- Block progress until all fields are filled

### Handling Specific Intent

> "Show me my archived items from last month"

A good response:
- Parses the query directly
- Calls the right tool with right parameters
- Returns focused, structured results
- Offers refinements as optional tuning

### First-Turn Value

Users may not know your brand. Your first response should:

1. **Explain your role** in one line
2. **Deliver useful output** immediately
3. **Offer clear next steps**

Example first response:
> "I track your items and help you organize them. Here are your 5 active items. Ask me to archive, delete, or create new ones."

### Progressive Disclosure

- Start with essential information
- Offer depth on request
- Don't overwhelm with every option upfront

---

## Ecosystem Design

ChatGPT may use multiple apps in one conversation. Design for orchestration:

### Small, Focused Operations

**Good:**
- `create_item`
- `update_item`
- `archive_item`

**Bad:**
- `full_item_lifecycle_manager`

Small tools let the model compose workflows flexibly.

### Composable Outputs

Make it easy for other tools (or the model) to use your output:

- Return **stable IDs** that can be referenced later
- Use **clear field names** in structured content
- Keep important information in **structured form**, not just prose

### Avoid Tunnel-Like Flows

Don't create multi-step wizards that lock users in:

- Do your part and return control to the conversation
- Let the model decide what comes next
- Support being one link in a multi-tool chain

---

## Building for Model + User

You're designing for two audiences:

### For the User (Human)
- Clear, helpful responses
- Interactive widgets that work
- Actionable error messages

### For the Model (Runtime)
- Unambiguous tool descriptions
- Predictable input/output schemas
- Consistent naming patterns

### Privacy by Design

- Only request fields you truly need
- Prefer minimal, structured inputs
- Keep sensitive data in `_meta` (hidden from model)
- Never embed secrets in user-visible responses

---

## Quick Checklist

Before shipping a tool:

- [ ] **New powers**: Does it give ChatGPT something it couldn't do?
- [ ] **Focused surface**: Is it one clear operation, not a product port?
- [ ] **First interaction**: Does a brand-unaware user get value immediately?
- [ ] **Model-friendly**: Are descriptions and schemas unambiguous?
- [ ] **Ecosystem fit**: Can other tools build on your output?

---

## Template Examples

This template implements these principles through:

| Tool | Know | Do | Show |
|------|------|-----|------|
| `get_user_items` | User's private data | - | Interactive list widget |
| `manage_item` | - | CRUD operations | Result confirmation widget |
| `get_weather` | Real-time external data | - | Weather display widget |
| `calculate_roi` | Investment calculations | - | Chart + table widget |
| `manage_subscription` | Subscription status | Billing portal access | Plan management widget |

Each demonstrates focused capability, clear naming, and proper Know/Do/Show value.

---

## Further Reading

- [OpenAI Apps SDK Documentation](https://developers.openai.com/apps-sdk/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [MCP Best Practices](./mcp-builder/reference/mcp_best_practices.md)
