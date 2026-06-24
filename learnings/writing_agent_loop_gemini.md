# Using the Google Interactions API

Google is now recommending the **Interactions API** for agentic workflows, so we should migrate to it.

One issue right now is that the package doesn't export all the types required to build requests cleanly. This makes it a little difficult to know the exact shape of some parameters.

A simple solution is to explicitly export the type declarations we need from the SDK source and use them directly in our codebase.

## Overall Flow

### 1. Create Tool Declarations

Define the function declarations that will be exposed to the model.

```ts
const tools: Tool2 = [
  askClarifyingQuestionsFunctionDeclaration,
  planningTasksFunctionDeclaration,
];
```

These declarations describe:

- Function name
- Description
- Parameters schema

The model uses these definitions to decide when a tool should be called.

---

### 2. Create the Client

```ts
const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});
```

---

### 3. Maintain Conversation State (Stateless Mode)

Since we're using **stateless mode**, we must manually keep the entire interaction history.

Initialize the history with the user's prompt:

```ts
const messageHistory: Step[] = [
  {
    type: "user_input",
    content: [
      {
        type: "text",
        text: prompt,
      },
    ],
  },
];
```

Every future model response and tool result will be appended to this array.

---

### 4. Call the Interactions API

```ts
const interaction = await client.interactions.create({
  model: "gemini-2.5-flash",
  tools,
  input: messageHistory,
});
```

The response contains a list of `steps`.

```ts
interaction.steps;
```

These steps may contain:

- Assistant text output
- Function calls
- Intermediate reasoning/tool orchestration steps

---

### 5. Base Condition: No Function Call

Before executing any tool, check whether the model actually requested one.

If there is **no `function_call` step**, the interaction is complete and we can return the final response.

Conceptually:

```ts
if (!containsFunctionCall(interaction.steps)) {
  return finalAssistantResponse;
}
```

This is the termination condition for the agent loop.

---

### 6. Execute Tool Calls

When a `function_call` step is found:

```ts
if (step.type === "function_call") {
  const { name, arguments: args } = step;
}
```

Example:

```ts
{
  type: "function_call",
  name: "planning_tasks",
  arguments: {
    steps: [...]
  }
}
```

Execute the corresponding application function:

```ts
const result = planningTasksFunction(args.steps);
```

---

### 7. Append Function Result to History

After executing the tool, send the result back to the model by adding a `function_result` step.

```ts
messageHistory.push({
  type: "function_result",
  name: step.name,
  call_id: step.id,
  result: [
    {
      type: "text",
      text: JSON.stringify(result),
    },
  ],
});
```

The model now has access to the tool output and can decide whether:

- Another tool call is needed
- It can generate a final answer

---

### 8. Repeat Until Completion

The complete flow becomes:

```text
User Prompt
      │
      ▼
Interactions API
      │
      ▼
Function Call?
 ┌────┴────┐
 │         │
No        Yes
 │         │
 ▼         ▼
Return   Execute Tool
Final      │
Answer     ▼
      Add function_result
            │
            ▼
      Call LLM Again
```

Or in pseudocode:

```ts
while (true) {
  const response = callLLM();

  if (!hasFunctionCall(response)) {
    return finalAnswer;
  }

  const toolResult = executeTool();

  addToolResultToHistory(toolResult);
}
```

The key idea is that in stateless mode, **`messageHistory` becomes the source of truth**. Every tool call and every tool result must be appended to it before sending the next request, allowing the model to continue the conversation as if it were maintaining state internally.
