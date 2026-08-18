import { useEffect, useState } from "react";
import { LibraryRail } from "@/components/library/LibraryRail";
import { ConversationPane } from "@/components/chat/ConversationPane";
import { EvidencePane } from "@/components/evidence/EvidencePane";
import { MobilePaneSwitcher, type MobilePane } from "@/components/layout/MobilePaneSwitcher";
import { useDocuments } from "@/hooks/use-documents";
import { useConversationMessages } from "@/hooks/use-conversations";
import type { SourceChunk } from "@docu-mind/shared";

export function WorkspacePage() {
  const { data: documents } = useDocuments();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [scope, setScope] = useState<"all-documents" | "single-document">("all-documents");
  const [selectedCitation, setSelectedCitation] = useState<SourceChunk | null>(null);
  const [search, setSearch] = useState("");
  const [mobilePane, setMobilePane] = useState<MobilePane>("chat");

  const { data: messages = [] } = useConversationMessages(conversationId);

  // Default to the first document once the library loads, without
  // overriding a choice the person already made.
  useEffect(() => {
    if (!selectedDocumentId && documents && documents.length > 0) {
      setSelectedDocumentId(documents[0].id);
    }
  }, [documents, selectedDocumentId]);

  const selectedDocument = documents?.find((doc) => doc.id === selectedDocumentId) ?? null;
  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
  const allCitations = lastAssistantMessage?.citations ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MobilePaneSwitcher pane={mobilePane} onChange={setMobilePane} />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className={`${mobilePane === "library" ? "flex" : "hidden"} min-h-0 flex-1 md:flex md:flex-none`}>
          <LibraryRail
            selectedDocumentId={selectedDocumentId}
            onSelectDocument={(id) => {
              setSelectedDocumentId(id);
              setMobilePane("chat");
            }}
            search={search}
            onSearchChange={setSearch}
          />
        </div>

        <div className={`${mobilePane === "chat" ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 md:flex`}>
          <ConversationPane
            conversationId={conversationId}
            onConversationCreated={setConversationId}
            selectedDocument={selectedDocument}
            scope={scope}
            onScopeChange={setScope}
            onCitationClick={(chunk) => {
              setSelectedCitation(chunk);
              setMobilePane("sources");
            }}
          />
        </div>

        <div className={`${mobilePane === "sources" ? "flex" : "hidden"} min-h-0 flex-1 md:flex`}>
          <EvidencePane
            citation={selectedCitation}
            allCitations={allCitations}
            onSelectCitation={setSelectedCitation}
          />
        </div>
      </div>
    </div>
  );
}
