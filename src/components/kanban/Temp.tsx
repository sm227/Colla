"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "react-beautiful-dnd"
import { Search, Plus, Filter, MoreHorizontal, ArrowUp, ArrowDown, Minus, User, Bug, CheckSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface KanbanCard {
  id: string
  title: string
  description?: string
  type: "story" | "bug" | "task"
  priority: "high" | "medium" | "low"
  assignee: {
    name: string
    avatar: string
    initials: string
  }
  storyPoints?: number
  labels: string[]
  comments?: Comment[]
  createdAt?: string
  updatedAt?: string
}

interface Comment {
  id: string
  author: {
    name: string
    initials: string
  }
  content: string
  createdAt: string
}

interface Column {
  id: string
  title: string
  cards: KanbanCard[]
  limit?: number
}

const initialData: Column[] = [
  {
    id: "backlog",
    title: "Backlog",
    cards: [
      {
        id: "1",
        title: "User authentication system",
        description:
          "Implement a comprehensive user authentication system with login, registration, password reset, and session management.",
        type: "story",
        priority: "high",
        assignee: { name: "John Doe", avatar: "/placeholder.svg?height=32&width=32", initials: "JD" },
        storyPoints: 8,
        labels: ["backend", "security"],
        createdAt: "2024-01-15T10:30:00Z",
        comments: [
          {
            id: "c1",
            author: { name: "John Doe", initials: "JD" },
            content: "Started working on the authentication flow. Will implement OAuth integration first.",
            createdAt: "2024-01-16T09:15:00Z",
          },
        ],
      },
      {
        id: "2",
        title: "Fix login button styling",
        description: "Address the styling issues with the login button to improve user experience.",
        type: "bug",
        priority: "medium",
        assignee: { name: "Jane Smith", avatar: "/placeholder.svg?height=32&width=32", initials: "JS" },
        storyPoints: 2,
        labels: ["frontend", "ui"],
        createdAt: "2024-01-18T14:00:00Z",
        comments: [],
      },
    ],
  },
  {
    id: "todo",
    title: "To Do",
    cards: [
      {
        id: "3",
        title: "Implement dashboard analytics",
        description:
          "Develop and integrate analytics components into the user dashboard to track key metrics and user behavior.",
        type: "story",
        priority: "medium",
        assignee: { name: "Mike Johnson", avatar: "/placeholder.svg?height=32&width=32", initials: "MJ" },
        storyPoints: 5,
        labels: ["frontend", "analytics"],
        createdAt: "2024-01-20T08:00:00Z",
        comments: [],
      },
      {
        id: "4",
        title: "Update API documentation",
        description:
          "Review and update the API documentation to reflect the latest changes and ensure clarity for developers.",
        type: "task",
        priority: "low",
        assignee: { name: "Sarah Wilson", avatar: "/placeholder.svg?height=32&width=32", initials: "SW" },
        storyPoints: 3,
        labels: ["documentation"],
        createdAt: "2024-01-22T16:45:00Z",
        comments: [],
      },
    ],
    limit: 5,
  },
  {
    id: "progress",
    title: "In Progress",
    cards: [
      {
        id: "5",
        title: "Database migration script",
        description: "Write and test a database migration script to update the database schema to the latest version.",
        type: "task",
        priority: "high",
        assignee: { name: "Alex Brown", avatar: "/placeholder.svg?height=32&width=32", initials: "AB" },
        storyPoints: 13,
        labels: ["backend", "database"],
        createdAt: "2024-01-25T11:20:00Z",
        comments: [],
      },
    ],
    limit: 3,
  },
  {
    id: "review",
    title: "In Review",
    cards: [
      {
        id: "6",
        title: "Payment integration testing",
        description:
          "Conduct thorough testing of the payment integration module to ensure secure and reliable transaction processing.",
        type: "story",
        priority: "high",
        assignee: { name: "Emma Davis", avatar: "/placeholder.svg?height=32&width=32", initials: "ED" },
        storyPoints: 8,
        labels: ["backend", "payment"],
        createdAt: "2024-01-28T13:55:00Z",
        comments: [],
      },
    ],
    limit: 3,
  },
  {
    id: "done",
    title: "Done",
    cards: [
      {
        id: "7",
        title: "Setup CI/CD pipeline",
        description: "Configure a CI/CD pipeline to automate the build, testing, and deployment processes.",
        type: "task",
        priority: "medium",
        assignee: { name: "Tom Wilson", avatar: "/placeholder.svg?height=32&width=32", initials: "TW" },
        storyPoints: 5,
        labels: ["devops", "automation"],
        createdAt: "2024-01-30T09:00:00Z",
        comments: [],
      },
      {
        id: "8",
        title: "Fix responsive design issues",
        description: "Identify and resolve responsive design issues across various screen sizes and devices.",
        type: "bug",
        priority: "low",
        assignee: { name: "Lisa Chen", avatar: "/placeholder.svg?height=32&width=32", initials: "LC" },
        storyPoints: 3,
        labels: ["frontend", "responsive"],
        createdAt: "2024-02-01T17:30:00Z",
        comments: [],
      },
    ],
  },
]

function getPriorityIcon(priority: string) {
  switch (priority) {
    case "high":
      return <ArrowUp className="w-4 h-4 text-red-500" />
    case "medium":
      return <ArrowDown className="w-4 h-4 text-yellow-500" />
    case "low":
      return <Minus className="w-4 h-4 text-green-500" />
    default:
      return <Minus className="w-4 h-4 text-gray-500" />
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case "story":
      return <User className="w-4 h-4 text-green-600" />
    case "bug":
      return <Bug className="w-4 h-4 text-red-600" />
    case "task":
      return <CheckSquare className="w-4 h-4 text-blue-600" />
    default:
      return <CheckSquare className="w-4 h-4 text-gray-600" />
  }
}

function KanbanCardComponent({
  card,
  index,
  onCardClick,
}: {
  card: KanbanCard
  index: number
  onCardClick: (card: KanbanCard) => void
}) {
  const handleCardClick = (e: React.MouseEvent) => {
    // 드래그 핸들이나 메뉴 버튼 클릭이 아닌 경우에만 상세 모달 열기
    if (
      !(e.target as HTMLElement).closest("[data-rbd-drag-handle-draggable-id]") &&
      !(e.target as HTMLElement).closest("button")
    ) {
      onCardClick(card)
    }
  }

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
          <Card
            className={`mb-3 cursor-pointer hover:shadow-md transition-shadow ${
              snapshot.isDragging ? "shadow-lg rotate-2" : ""
            }`}
          >
            <CardContent
              className="p-3"
              onClick={(e) => {
                e.stopPropagation()
                onCardClick(card)
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getTypeIcon(card.type)}
                  <span className="text-xs text-muted-foreground uppercase">{card.type}</span>
                </div>
                <div className="flex items-center gap-1">
                  {getPriorityIcon(card.priority)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Delete</DropdownMenuItem>
                      <DropdownMenuItem>Move to...</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <h3 className="font-medium text-sm mb-3 leading-tight">{card.title}</h3>

              <div className="flex flex-wrap gap-1 mb-3">
                {card.labels.map((label) => (
                  <Badge key={label} variant="secondary" className="text-xs px-2 py-0">
                    {label}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={card.assignee.avatar || "/placeholder.svg"} alt={card.assignee.name} />
                  <AvatarFallback className="text-xs">{card.assignee.initials}</AvatarFallback>
                </Avatar>
                {card.storyPoints && (
                  <Badge variant="outline" className="text-xs">
                    {card.storyPoints} SP
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  )
}

function KanbanColumn({ column, onCardClick }: { column: Column; onCardClick: (card: KanbanCard) => void }) {
  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm">{column.title}</h2>
            <Badge variant="secondary" className="text-xs">
              {column.cards.length}
              {column.limit && `/${column.limit}`}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-0 min-h-[200px] transition-colors ${
                snapshot.isDraggingOver ? "bg-muted/30 rounded-md" : ""
              }`}
            >
              {column.cards.map((card, index) => (
                <KanbanCardComponent key={card.id} card={card} index={index} onCardClick={onCardClick} />
              ))}
              {provided.placeholder}

              {column.cards.length === 0 && !snapshot.isDraggingOver && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No items</p>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  )
}

export default function KanbanBoard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [columns, setColumns] = useState<Column[]>(initialData)

  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false)
  const [newIssue, setNewIssue] = useState({
    title: "",
    type: "story" as "story" | "bug" | "task",
    priority: "medium" as "high" | "medium" | "low",
    assignee: "JD",
    description: "",
    labels: "",
    storyPoints: 1,
    columnId: "backlog",
  })

  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null)
  const [isCardDetailOpen, setIsCardDetailOpen] = useState(false)
  const [isEditingCard, setIsEditingCard] = useState(false)
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null)

  const totalCards = columns.reduce((sum, column) => sum + column.cards.length, 0)

  const assigneeOptions = [
    { value: "JD", name: "John Doe", initials: "JD" },
    { value: "JS", name: "Jane Smith", initials: "JS" },
    { value: "MJ", name: "Mike Johnson", initials: "MJ" },
    { value: "SW", name: "Sarah Wilson", initials: "SW" },
    { value: "AB", name: "Alex Brown", initials: "AB" },
    { value: "ED", name: "Emma Davis", initials: "ED" },
    { value: "TW", name: "Tom Wilson", initials: "TW" },
    { value: "LC", name: "Lisa Chen", initials: "LC" },
  ]

  const handleCreateIssue = useCallback(() => {
    const selectedAssignee = assigneeOptions.find((a) => a.value === newIssue.assignee) || assigneeOptions[0]

    const issue: KanbanCard = {
      id: Date.now().toString(),
      title: newIssue.title,
      type: newIssue.type,
      priority: newIssue.priority,
      assignee: {
        name: selectedAssignee.name,
        avatar: "/placeholder.svg?height=32&width=32",
        initials: selectedAssignee.initials,
      },
      storyPoints: newIssue.storyPoints,
      labels: newIssue.labels
        .split(",")
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
    }

    const newColumns = [...columns]
    const targetColumn = newColumns.find((col) => col.id === newIssue.columnId)
    if (targetColumn) {
      targetColumn.cards.unshift(issue)
      setColumns(newColumns)
    }

    // Reset form
    setNewIssue({
      title: "",
      type: "story",
      priority: "medium",
      assignee: "JD",
      description: "",
      labels: "",
      storyPoints: 1,
      columnId: "backlog",
    })
    setIsCreateIssueOpen(false)
  }, [newIssue, columns, assigneeOptions])

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) {
      return
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    const newColumns = [...columns]
    const sourceColumn = newColumns.find((col) => col.id === source.droppableId)
    const destColumn = newColumns.find((col) => col.id === destination.droppableId)

    if (!sourceColumn || !destColumn) return

    const draggedCard = sourceColumn.cards.find((card) => card.id === draggableId)
    if (!draggedCard) return

    // Remove card from source column
    sourceColumn.cards = sourceColumn.cards.filter((card) => card.id !== draggableId)

    // Add card to destination column
    destColumn.cards.splice(destination.index, 0, draggedCard)

    setColumns(newColumns)
  }

  const handleUpdateCard = useCallback(
    (updatedCard: KanbanCard) => {
      const newColumns = [...columns]
      for (const column of newColumns) {
        const cardIndex = column.cards.findIndex((card) => card.id === updatedCard.id)
        if (cardIndex !== -1) {
          column.cards[cardIndex] = { ...updatedCard, updatedAt: new Date().toISOString() }
          break
        }
      }
      setColumns(newColumns)
      setSelectedCard(updatedCard)
    },
    [columns],
  )

  const handleCardClick = useCallback((card: KanbanCard) => {
    setSelectedCard(card)
    setIsCardDetailOpen(true)
  }, [])

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Project Kanban Board</h1>
              <p className="text-muted-foreground">Manage your project tasks and workflow</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Dialog open={isCreateIssueOpen} onOpenChange={setIsCreateIssueOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Issue
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Issue</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                          id="title"
                          placeholder="Enter issue title"
                          value={newIssue.title}
                          onChange={(e) => setNewIssue((prev) => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="column">Column</Label>
                        <Select
                          value={newIssue.columnId}
                          onValueChange={(value) => setNewIssue((prev) => ({ ...prev, columnId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {columns.map((column) => (
                              <SelectItem key={column.id} value={column.id}>
                                {column.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select
                          value={newIssue.type}
                          onValueChange={(value: "story" | "bug" | "task") =>
                            setNewIssue((prev) => ({ ...prev, type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="story">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-green-600" />
                                Story
                              </div>
                            </SelectItem>
                            <SelectItem value="bug">
                              <div className="flex items-center gap-2">
                                <Bug className="w-4 h-4 text-red-600" />
                                Bug
                              </div>
                            </SelectItem>
                            <SelectItem value="task">
                              <div className="flex items-center gap-2">
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                                Task
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                          value={newIssue.priority}
                          onValueChange={(value: "high" | "medium" | "low") =>
                            setNewIssue((prev) => ({ ...prev, priority: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">
                              <div className="flex items-center gap-2">
                                <ArrowUp className="w-4 h-4 text-red-500" />
                                High
                              </div>
                            </SelectItem>
                            <SelectItem value="medium">
                              <div className="flex items-center gap-2">
                                <ArrowDown className="w-4 h-4 text-yellow-500" />
                                Medium
                              </div>
                            </SelectItem>
                            <SelectItem value="low">
                              <div className="flex items-center gap-2">
                                <Minus className="w-4 h-4 text-green-500" />
                                Low
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="assignee">Assignee</Label>
                        <Select
                          value={newIssue.assignee}
                          onValueChange={(value) => setNewIssue((prev) => ({ ...prev, assignee: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {assigneeOptions.map((assignee) => (
                              <SelectItem key={assignee.value} value={assignee.value}>
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-5 h-5">
                                    <AvatarFallback className="text-xs">{assignee.initials}</AvatarFallback>
                                  </Avatar>
                                  {assignee.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="labels">Labels</Label>
                        <Input
                          id="labels"
                          placeholder="frontend, backend, ui (comma separated)"
                          value={newIssue.labels}
                          onChange={(e) => setNewIssue((prev) => ({ ...prev, labels: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="storyPoints">Story Points</Label>
                        <Select
                          value={newIssue.storyPoints.toString()}
                          onValueChange={(value) =>
                            setNewIssue((prev) => ({ ...prev, storyPoints: Number.parseInt(value) }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 5, 8, 13, 21].map((point) => (
                              <SelectItem key={point} value={point.toString()}>
                                {point}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the issue in detail..."
                        value={newIssue.description}
                        onChange={(e) => setNewIssue((prev) => ({ ...prev, description: e.target.value }))}
                        rows={4}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsCreateIssueOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateIssue} disabled={!newIssue.title.trim()}>
                        Create Issue
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search issues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground">{totalCards} issues</div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-4 min-w-max">
            {columns.map((column) => (
              <KanbanColumn key={column.id} column={column} onCardClick={handleCardClick} />
            ))}
          </div>
        </div>

        {/* Card Detail Modal */}
        {selectedCard && (
          <Dialog open={isCardDetailOpen} onOpenChange={setIsCardDetailOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(selectedCard.type)}
                    <DialogTitle className="text-xl">{selectedCard.title}</DialogTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingCard(selectedCard)
                        setIsEditingCard(true)
                      }}
                    >
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Move to...</DropdownMenuItem>
                        <DropdownMenuItem>Copy link</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-6 py-4">
                {/* Main Content */}
                <div className="col-span-2 space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">
                        {selectedCard.description || "No description provided."}
                      </p>
                    </div>
                  </div>

                  {/* Comments */}
                  <div>
                    <h3 className="font-semibold mb-4">Activity</h3>
                    <div className="space-y-4">
                      {selectedCard.comments?.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">{comment.author.initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="bg-muted/50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{comment.author.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm">{comment.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Add Comment */}
                      <div className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">YU</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Textarea placeholder="Add a comment..." rows={3} />
                          <div className="flex justify-end mt-2">
                            <Button size="sm">Comment</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  {/* Status */}
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="mt-1">
                      <Badge variant="secondary">
                        {columns.find((col) => col.cards.some((card) => card.id === selectedCard.id))?.title}
                      </Badge>
                    </div>
                  </div>

                  {/* Assignee */}
                  <div>
                    <Label className="text-sm font-medium">Assignee</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="w-6 h-6">
                        <AvatarImage
                          src={selectedCard.assignee.avatar || "/placeholder.svg"}
                          alt={selectedCard.assignee.name}
                        />
                        <AvatarFallback className="text-xs">{selectedCard.assignee.initials}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{selectedCard.assignee.name}</span>
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <Label className="text-sm font-medium">Priority</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {getPriorityIcon(selectedCard.priority)}
                      <span className="text-sm capitalize">{selectedCard.priority}</span>
                    </div>
                  </div>

                  {/* Story Points */}
                  {selectedCard.storyPoints && (
                    <div>
                      <Label className="text-sm font-medium">Story Points</Label>
                      <div className="mt-1">
                        <Badge variant="outline">{selectedCard.storyPoints} SP</Badge>
                      </div>
                    </div>
                  )}

                  {/* Labels */}
                  <div>
                    <Label className="text-sm font-medium">Labels</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedCard.labels.map((label) => (
                        <Badge key={label} variant="secondary" className="text-xs">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {selectedCard.createdAt && (
                      <div>
                        <span className="font-medium">Created:</span>{" "}
                        {new Date(selectedCard.createdAt).toLocaleDateString()}
                      </div>
                    )}
                    {selectedCard.updatedAt && (
                      <div>
                        <span className="font-medium">Updated:</span>{" "}
                        {new Date(selectedCard.updatedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Card Modal */}
        {editingCard && (
          <Dialog open={isEditingCard} onOpenChange={setIsEditingCard}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Issue</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* 이슈 생성 폼과 동일한 구조로 편집 폼 구현 */}
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input
                    id="edit-title"
                    value={editingCard.title}
                    onChange={(e) => setEditingCard((prev) => (prev ? { ...prev, title: e.target.value } : null))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingCard.description || ""}
                    onChange={(e) => setEditingCard((prev) => (prev ? { ...prev, description: e.target.value } : null))}
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditingCard(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (editingCard) {
                        handleUpdateCard(editingCard)
                        setIsEditingCard(false)
                        setEditingCard(null)
                      }
                    }}
                    disabled={!editingCard?.title.trim()}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DragDropContext>
  )
}
