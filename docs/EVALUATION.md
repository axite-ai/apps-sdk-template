# MCP Server Evaluation Framework

This guide explains how to create and run evaluations to test whether LLMs can effectively use your MCP server to accomplish real-world tasks.

## Why Evaluate?

Evaluations help you:
- Test that your tools work as expected with LLMs
- Identify edge cases and error handling gaps
- Measure tool effectiveness before deployment
- Track quality across changes

## Creating Evaluations

### Evaluation Requirements

Each evaluation question should be:

1. **Independent** - Not dependent on other questions or prior state
2. **Read-only** - Only use non-destructive operations
3. **Complex** - Require multiple tool calls and reasoning
4. **Realistic** - Based on real use cases humans care about
5. **Verifiable** - Single, clear answer that can be string-compared
6. **Stable** - Answer won't change over time (avoid live data)

### Question Design Process

1. **Tool Inspection**: List available tools and understand capabilities
2. **Content Exploration**: Use read-only operations to explore data
3. **Question Generation**: Create realistic, complex questions
4. **Answer Verification**: Solve each question yourself to verify

### Example Questions

**Good - Multi-step, verifiable:**
> Create an item titled "Test Project", then retrieve all active items. How many items are returned? Answer with just the number.

**Good - Requires calculation:**
> Calculate the ROI for a $50,000 investment at 8% annual return over 15 years. What is the final value rounded to the nearest thousand dollars? Answer with just the number.

**Bad - Depends on live data:**
> What is the current temperature in New York?

**Bad - Subjective:**
> Which item has the best description?

**Bad - Too simple (single tool):**
> List my items.

## Evaluation File Format

Create evaluations in XML format:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<evaluation>
  <qa_pair>
    <question>Using the ROI calculator, what is the final value of a $10,000 investment at 7% annual return over 10 years? Round to the nearest dollar and answer with just the number.</question>
    <answer>19672</answer>
  </qa_pair>

  <qa_pair>
    <question>Create an item titled "Evaluation Test" with description "Testing the MCP server". What is the ID of the created item? Answer with just the ID.</question>
    <answer>DYNAMIC</answer>
  </qa_pair>

  <qa_pair>
    <question>Get the weather for "Detroit, MI". Is the temperature above or below 50°F? Answer with just "above" or "below".</question>
    <answer>VARIES</answer>
  </qa_pair>
</evaluation>
```

### Answer Types

| Type | Use When | Example |
|------|----------|---------|
| Static | Answer is deterministic | `19672` |
| Pattern | Answer matches a format | Regex pattern |
| DYNAMIC | Answer varies but is verifiable | Item IDs |
| VARIES | Answer depends on external state | Weather data |

## Running Evaluations

### With MCP Inspector

```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Start your MCP server
pnpm dev

# Run inspector
npx @modelcontextprotocol/inspector http://localhost:3001/mcp
```

### Manual Testing

1. Start your server: `pnpm dev`
2. Connect a ChatGPT-like interface
3. Run through each question in the evaluation
4. Compare responses to expected answers

### Automated Evaluation (Advanced)

For automated evaluation against Claude or GPT:

```bash
# Example with Claude (requires setup)
python scripts/run_evaluation.py \
  --server-url http://localhost:3001/mcp \
  --eval-file evaluations/axite-mcp.xml \
  --model claude-3-opus
```

## Interpreting Results

### Metrics to Track

| Metric | Description | Target |
|--------|-------------|--------|
| Accuracy | % questions answered correctly | >90% |
| Tool calls per question | Average tools invoked | Varies |
| Error rate | % questions that failed | <5% |
| Latency | Average response time | <5s |

### Common Issues

| Issue | Likely Cause |
|-------|--------------|
| Wrong tool called | Unclear tool descriptions |
| Missing parameters | Schema not descriptive enough |
| Incorrect output parsing | Inconsistent response format |
| Tool not found | Naming not discoverable |

## Template Evaluation Example

For this template, here are example evaluation questions:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<evaluation>
  <!-- ROI Calculator Tests -->
  <qa_pair>
    <question>Calculate the ROI for a $10,000 investment at 7% annual return over 10 years. What is the final value rounded to the nearest dollar?</question>
    <answer>19672</answer>
  </qa_pair>

  <qa_pair>
    <question>Using the ROI calculator with $25,000 at 5% for 20 years, what is the total percentage return (not annualized)? Round to one decimal place.</question>
    <answer>165.3</answer>
  </qa_pair>

  <!-- Item Management Tests (require auth) -->
  <qa_pair>
    <question>How many parameters does the manage_item tool accept? Count all parameters listed in its description.</question>
    <answer>6</answer>
  </qa_pair>

  <!-- Weather Tests (external API) -->
  <qa_pair>
    <question>What information is returned in the "current" section of the weather response? List the field names separated by commas in alphabetical order.</question>
    <answer>condition, feelsLike, humidity, temperature, windSpeed</answer>
  </qa_pair>

  <!-- Cross-Tool Questions -->
  <qa_pair>
    <question>Which tools in this MCP server require authentication? List their names separated by commas in alphabetical order.</question>
    <answer>get_user_items, manage_item, manage_subscription</answer>
  </qa_pair>

  <qa_pair>
    <question>Which tools call external APIs (have openWorldHint: true)? List in alphabetical order, comma-separated.</question>
    <answer>get_weather, manage_subscription</answer>
  </qa_pair>
</evaluation>
```

## Best Practices

1. **Start simple**: Begin with basic tool calls before complex scenarios
2. **Cover edge cases**: Test error handling and validation
3. **Update regularly**: Add evaluations for new features
4. **Version control**: Track evaluation results over time
5. **Use realistic data**: Mirror production scenarios

## Further Reading

- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [mcp-builder Evaluation Guide](./mcp-builder/reference/evaluation.md)
- [OpenAI Apps SDK Testing](https://developers.openai.com/apps-sdk/)
