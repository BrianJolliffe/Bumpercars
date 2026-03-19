import { useState } from "react";
import { X, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";

interface AddNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: { title: string; content: string; tags: string[]; visibility: "Me Only" | "Associates Only" | "Everyone" }) => void;
  campaignName: string;
}

const PRESET_TAGS = [
  "Pacing",
  "Budget",
  "Performance",
  "Creative",
  "Optimization",
  "Schedule",
  "Status",
  "CTR",
  "ROAS",
  "Targeting",
  "Strategy",
  "Issues",
];

const VISIBILITY_OPTIONS = ["Me Only", "Associates Only", "Everyone"] as const;

export function AddNoteDialog({ isOpen, onClose, onSave, campaignName }: AddNoteDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [visibility, setVisibility] = useState<"Me Only" | "Associates Only" | "Everyone">("Me Only");
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return;

    onSave({
      title: title.trim(),
      content: content.trim(),
      tags: selectedTags,
      visibility,
    });

    // Reset form
    setTitle("");
    setContent("");
    setSelectedTags([]);
    setCustomTag("");
    setVisibility("Me Only");
  };

  const handleAddCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags([...selectedTags, customTag.trim()]);
      setCustomTag("");
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Note for {campaignName}</DialogTitle>
          <DialogDescription>
            Add a note to keep track of important information related to your campaign.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note Title
            </label>
            <Input
              type="text"
              placeholder="Enter note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note Content
            </label>
            <textarea
              placeholder="Enter your note..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f26318] focus:border-transparent resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            
            {/* Selected Tags */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-gray-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Tag Selection Dropdown */}
            <Popover open={showTagDropdown} onOpenChange={setShowTagDropdown}>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                  <span className="text-sm text-gray-600">Select tags...</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-3" align="start">
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Preset Tags
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {PRESET_TAGS.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          selectedTags.includes(tag)
                            ? "bg-[#f26318] text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <div className="border-t pt-3">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Add Custom Tag
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Custom tag name..."
                        value={customTag}
                        onChange={(e) => setCustomTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCustomTag();
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleAddCustomTag}
                        size="sm"
                        className="bg-[#f26318] hover:bg-[#d94f0f] text-white"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visibility
            </label>
            <Popover open={showVisibilityDropdown} onOpenChange={setShowVisibilityDropdown}>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                  <span className="text-sm text-gray-700">{visibility}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-1" align="start">
                {VISIBILITY_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setVisibility(option);
                      setShowVisibilityDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                      visibility === option
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onClose}
            variant="outline"
            className="mr-2"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || !content.trim()}
            className="bg-[#f26318] hover:bg-[#d94f0f] text-white"
          >
            Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}