import type { UiChatMessage } from '../../tauri/commandTypes';

export function MessageList({ messages }: { messages: UiChatMessage[] }) {
  return (
    <div className="message-list" aria-label="chat messages">
      {messages.map((message) => (
        <article className={`message message-${message.role}`} key={message.id}>
          {message.content}
        </article>
      ))}
    </div>
  );
}
