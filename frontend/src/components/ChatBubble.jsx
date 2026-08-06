import ReactMarkdown from "react-markdown";
import { Volume2 } from "lucide-react";

export default function ChatBubble({ role, content, onSpeak }) {
  if (role === "user") {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[70%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-primary text-white text-[15px] leading-[1.7] whitespace-pre-wrap shadow-sm">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-fade-in">
      <div className="h-px bg-border mb-6" />
      <div className="max-w-[720px] md:max-w-[720px] leading-[1.8] text-[15px] text-text">
        <div className="md-content">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
        {onSpeak && (
          <button
            type="button"
            onClick={onSpeak}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border/70 px-2.5 py-1.5 text-[12px] text-dim transition-colors hover:text-text hover:border-border cursor-pointer"
            title="语音播报这条回复"
          >
            <Volume2 size={12} />
            播报
          </button>
        )}
      </div>
    </div>
  );
}
