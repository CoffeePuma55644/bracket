"use client"

import { useEffect, useRef, useState } from "react"
import { BracketsManager } from "brackets-manager"
import { ChevronRight, Play, Trophy, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"

type DemoSummary = {
  participantCount: number
  stageCount: number
  roundCount: number
  matchCount: number
}

type TableName = "participant" | "stage" | "group" | "round" | "match" | "match_game"

const teams = [
  "Atlas",
  "Beacon",
  "Comet",
  "Delta",
  "Echo",
  "Flux",
  "Glint",
  "Harbor",
]

function createMemoryStorage() {
  const tables: Record<TableName, any[]> = {
    participant: [],
    stage: [],
    group: [],
    round: [],
    match: [],
    match_game: [],
  }

  const clone = <T,>(value: T): T => {
    if (typeof structuredClone === "function") return structuredClone(value)
    return JSON.parse(JSON.stringify(value)) as T
  }

  const getTable = (table: TableName) => tables[table]

  const matchesFilter = (record: Record<string, any>, filter: any) => {
    if (filter === undefined) return true
    if (typeof filter === "number") return record.id === filter
    if (Array.isArray(filter)) return filter.includes(record.id)

    return Object.entries(filter).every(([key, value]) => record[key] === value)
  }

  const insertOne = (table: TableName, row: Record<string, any>) => {
    const nextId = row.id ?? (getTable(table).at(-1)?.id ?? -1) + 1
    const record = { ...clone(row), id: nextId }
    getTable(table).push(record)
    return nextId
  }

  return {
    async select(table: TableName, filter?: any) {
      const rows = getTable(table).filter((record) => matchesFilter(record, filter))
      if (filter === undefined) return clone(rows)
      if (typeof filter === "number") return clone(rows[0] ?? null)
      if (Array.isArray(filter)) return clone(rows)
      return clone(rows)
    },
    async insert(table: TableName, data: any) {
      if (Array.isArray(data)) return data.map((row) => insertOne(table, row))
      return insertOne(table, data)
    },
    async update(table: TableName, data: any) {
      if (Array.isArray(data)) {
        data.forEach((row) => {
          const index = getTable(table).findIndex((record) => record.id === row.id)
          if (index >= 0) getTable(table)[index] = { ...getTable(table)[index], ...clone(row) }
        })

        return true
      }

      const index = getTable(table).findIndex((record) => record.id === data.id)
      if (index >= 0) getTable(table)[index] = { ...getTable(table)[index], ...clone(data) }
      return true
    },
    async delete(table: TableName, filter?: any) {
      if (filter === undefined) {
        tables[table] = []
        return true
      }

      tables[table] = getTable(table).filter((record) => !matchesFilter(record, filter))
      return true
    },
    async reset() {
      for (const table of Object.keys(tables) as TableName[]) tables[table] = []
    },
  }
}

const storage = createMemoryStorage()
const manager = new BracketsManager(storage as never)

function BracketDemo() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)
  const [summary, setSummary] = useState<DemoSummary>({
    participantCount: 0,
    stageCount: 0,
    roundCount: 0,
    matchCount: 0,
  })
  const [message, setMessage] = useState("Building bracket simulation...")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function runSimulation() {
      setMessage("Building bracket simulation...")
      setError(null)

      try {
        await storage.reset()

        await manager.create.stage({
          name: "Bracket demo",
          tournamentId: 0,
          type: "single_elimination",
          seeding: teams,
          settings: {
            seedOrdering: ["natural"],
          },
        })

        const data = await manager.export()

        if (cancelled) return

        setSummary({
          participantCount: data.participant.length,
          stageCount: data.stage.length,
          roundCount: data.round.length,
          matchCount: data.match.length,
        })
        setMessage("Live bracket simulation ready")

        const { BracketsViewer } = await import("brackets-viewer")
        const viewer = new BracketsViewer()

        if (containerRef.current) {
          containerRef.current.innerHTML = ""
          await viewer.render({
            stages: data.stage,
            matches: data.match,
            matchGames: data.match_game,
          })
        }
      } catch (err) {
        if (cancelled) return

        const messageText = err instanceof Error ? err.message : "Unable to build the bracket demo."
        setError(messageText)
        setMessage("Simulation failed")
      }
    }

    void runSimulation()

    return () => {
      cancelled = true
    }
  }, [refreshIndex])

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,_var(--color-primary)/10,_transparent_42%),radial-gradient(circle_at_top_right,_var(--color-accent)/14,_transparent_36%),linear-gradient(to_bottom,_var(--color-background),color-mix(in_oklch,var(--color-background),var(--color-foreground)_3%))] text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 rounded-[2rem] border border-border/70 bg-background/75 p-5 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Open source demo
            </Badge>
            <div className="space-y-1">
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Bracket simulation avec brackets-manager
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                Une petite démo qui génère un vrai arbre d&apos;élimination directe, l&apos;affiche avec le viewer officiel,
                et applique le thème global Shadcn light/dark.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button onClick={() => setRefreshIndex((value) => value + 1)} className="gap-2 rounded-full">
              <Play className="size-4" />
              Relancer la simulation
            </Button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Résumé</CardTitle>
                <CardDescription>Les données sont créées côté client puis envoyées au viewer.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="size-4" />
                      Participants
                    </div>
                    <div className="mt-2 text-2xl font-semibold">{summary.participantCount}</div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Trophy className="size-4" />
                      Matches
                    </div>
                    <div className="mt-2 text-2xl font-semibold">{summary.matchCount}</div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                    <div className="text-muted-foreground">Stages</div>
                    <div className="mt-1 text-lg font-medium">{summary.stageCount}</div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                    <div className="text-muted-foreground">Rounds</div>
                    <div className="mt-1 text-lg font-medium">{summary.roundCount}</div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                    <div className="text-muted-foreground">Teams</div>
                    <div className="mt-1 text-lg font-medium">{teams.length}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Status</div>
                  <p className="mt-1">{error ?? message}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Participants</CardTitle>
                <CardDescription>La seeding utilisée pour la simulation.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {teams.map((team, index) => (
                  <Badge key={team} variant="outline" className="rounded-full px-3 py-1">
                    {index + 1}. {team}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="min-h-[42rem]">
            <CardHeader className="border-b border-border/60">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Bracket live</CardTitle>
                  <CardDescription>Le viewer s&apos;attache à un conteneur vide et le remplit après montage.</CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ChevronRight className="size-4" />
                  {message}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-hidden p-3">
                <div
                  ref={containerRef}
                  className="brackets-viewer min-h-[34rem] rounded-[1.5rem] border border-border/60 bg-background/90 p-4"
                />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}

export { BracketDemo }