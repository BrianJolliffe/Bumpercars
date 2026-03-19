import { useState } from "react";
import { X, Plus, Search, Eye, ListFilter } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { AddNoteDialog } from "@/app/components/AddNoteDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  visibility: "Me Only" | "Associates Only" | "Everyone";
  date: string;
  createdBy: string;
}

interface NotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
  notes: Note[];
  onAddNote: (note: Omit<Note, "id" | "date" | "createdBy">) => void;
}

export function NotesDrawer({ isOpen, onClose, campaignId, campaignName, notes, onAddNote }: NotesDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [selectedVisibility, setSelectedVisibility] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Get all unique tags from notes
  const allTags = Array.from(new Set(notes.flatMap(note => note.tags))).sort();

  const toggleNoteExpansion = (noteId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const toggleVisibilityFilter = (visibility: string) => {
    setSelectedVisibility(prev => {
      const newSet = new Set(prev);
      
      if (newSet.has(visibility)) {
        newSet.delete(visibility);
      } else {
        newSet.add(visibility);
      }
      
      return newSet;
    });
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  };

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // If no visibility filters selected, show all; otherwise only show selected
    const matchesVisibility = 
      selectedVisibility.size === 0 || selectedVisibility.has(note.visibility);
    
    // If no tag filters selected, show all; otherwise only show notes with selected tags
    const matchesTags = 
      selectedTags.size === 0 || note.tags.some(tag => selectedTags.has(tag));
    
    return matchesSearch && matchesVisibility && matchesTags;
  });

  const activeFilterCount = selectedVisibility.size + selectedTags.size;

  const handleAddNote = (noteData: Omit<Note, "id" | "date" | "createdBy">) => {
    onAddNote(noteData);
    setShowAddNoteDialog(false);
  };

  const getVisibilityBadgeColor = (visibility: string) => {
    switch (visibility) {
      case "Me Only":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Associates Only":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "Everyone":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-semibold">Notes</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search notes or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Filter Dropdown */}
            <div>
              <Popover open={showFilterDropdown} onOpenChange={setShowFilterDropdown}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors">
                    <ListFilter className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">
                      {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-3" align="start">
                  {/* Visibility Section */}
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Visibility
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                        <input
                          type="checkbox"
                          checked={selectedVisibility.has("Me Only")}
                          onChange={() => toggleVisibilityFilter("Me Only")}
                          className="w-4 h-4 text-[#f26318] border-gray-300 rounded focus:ring-[#f26318]"
                        />
                        <span className="text-sm text-gray-700">Me Only</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                        <input
                          type="checkbox"
                          checked={selectedVisibility.has("Associates Only")}
                          onChange={() => toggleVisibilityFilter("Associates Only")}
                          className="w-4 h-4 text-[#f26318] border-gray-300 rounded focus:ring-[#f26318]"
                        />
                        <span className="text-sm text-gray-700">Associates Only</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                        <input
                          type="checkbox"
                          checked={selectedVisibility.has("Everyone")}
                          onChange={() => toggleVisibilityFilter("Everyone")}
                          className="w-4 h-4 text-[#f26318] border-gray-300 rounded focus:ring-[#f26318]"
                        />
                        <span className="text-sm text-gray-700">Everyone</span>
                      </label>
                    </div>
                  </div>

                  {/* Tags Section */}
                  {allTags.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Tags
                      </div>
                      <div className="space-y-2">
                        {allTags.map(tag => (
                          <label key={tag} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                            <input
                              type="checkbox"
                              checked={selectedTags.has(tag)}
                              onChange={() => toggleTagFilter(tag)}
                              className="w-4 h-4 text-[#f26318] border-gray-300 rounded focus:ring-[#f26318]"
                            />
                            <span className="text-sm text-gray-700">{tag}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Add New Note Button */}
        <div className="px-6 py-3">
          <button
            onClick={() => setShowAddNoteDialog(true)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
          >
            <Plus className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Add new note</span>
          </button>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No notes yet</p>
              <p className="text-xs mt-1">Click "Add new note" to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotes.map((note) => {
                const isExpanded = expandedNotes.has(note.id);
                
                return (
                  <div
                    key={note.id}
                    className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors relative"
                  >
                    {/* Visibility indicator in top right */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 text-gray-400">
                      <Eye className="w-3 h-3" />
                      <span className="text-[10px]">{note.visibility}</span>
                    </div>
                    
                    <div className="text-xs text-gray-400 mb-2 tracking-wide">
                      {note.date}
                    </div>
                    <div className="text-xs text-gray-500 mb-3">
                      Created by {note.createdBy}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 pr-20">
                      {note.title}
                    </h3>
                    <p className={`text-sm text-gray-500 mb-2 ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {note.content}
                    </p>
                    
                    {/* Show more/less button */}
                    <button
                      onClick={() => toggleNoteExpansion(note.id)}
                      className="text-xs text-[#f26318] hover:text-[#d45515] font-medium mb-3"
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                    
                    <div className="flex flex-wrap gap-2">
                      {note.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-white rounded-full text-xs text-gray-600 border border-gray-200"
                        >
                          {tag}
                        </span>
                      ))}
                      {note.tags.length > 3 && (
                        <span className="px-3 py-1 bg-white rounded-full text-xs text-gray-600 border border-gray-200">
                          +{note.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Note Dialog */}
      <AddNoteDialog
        isOpen={showAddNoteDialog}
        onClose={() => setShowAddNoteDialog(false)}
        onSave={handleAddNote}
        campaignName={campaignName}
      />
    </>
  );
}