"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { BracketsManager } from "brackets-manager"
import { InMemoryDatabase } from "brackets-memory-db"
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

type BracketData = Awaited<ReturnType<typeof manager.export>>

type BracketMatch = {
  id: number
  number: number
  state: number
  opponent1: string
  opponent2: string
  score1: number | string
  score2: number | string
  winnerSide: "opponent1" | "opponent2" | null
}

type BracketColumn = {
  title: string
  subtitle: string
  matches: BracketMatch[]
}

const completedTop8Teams = [
  "Atlas",
  "Beacon",
  "Comet",
  "Delta",
  "Echo",
  "Flux",
  "Glint",
  "Harbor",
]

const completedMatchResults = [
  { id: 0, opponent1: { score: 3, result: "win" }, opponent2: { score: 1 } },
  { id: 1, opponent1: { score: 2, result: "win" }, opponent2: { score: 0 } },
  { id: 2, opponent1: { score: 1 }, opponent2: { score: 2, result: "win" } },
  { id: 3, opponent1: { score: 4, result: "win" }, opponent2: { score: 2 } },
  { id: 4, opponent1: { score: 2, result: "win" }, opponent2: { score: 1 } },
  { id: 5, opponent1: { score: 1 }, opponent2: { score: 2, result: "win" } },
  { id: 6, opponent1: { score: 3 }, opponent2: { score: 4, result: "win" } },
]

const storage = new InMemoryDatabase()
const manager = new BracketsManager(storage)
const teams = completedTop8Teams

function BracketDemo() {
  const [refreshIndex, setRefreshIndex] = useState(0)
  const [summary, setSummary] = useState<DemoSummary>({
    participantCount: 0,
    stageCount: 0,
    roundCount: 0,
    matchCount: 0,
  })
  const [bracketData, setBracketData] = useState<BracketData | null>(null)
  const [message, setMessage] = useState("Building bracket simulation...")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function runSimulation() {
      setMessage("Building bracket simulation...")
      setError(null)

      try {
        storage.reset()

        await manager.create.stage({
          name: "Bracket demo",
          tournamentId: 0,
          type: "single_elimination",
          seeding: completedTop8Teams,
          settings: {
            seedOrdering: ["natural"],
          },
        })

        for (const result of completedMatchResults) {
          await manager.update.match({
            id: result.id,
            opponent1: result.opponent1,
            opponent2: result.opponent2,
          })
        }

        const data = await manager.export()

        if (cancelled) return

        setSummary({
          participantCount: data.participant.length,
          stageCount: data.stage.length,
          roundCount: data.round.length,
          matchCount: data.match.length,
        })
        setBracketData(data)
        setMessage("Live bracket simulation ready")
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

  const rounds = useMemo(() => {
    if (!bracketData) return []

    const participantById = new Map(bracketData.participant.map((participant) => [participant.id, participant]))
    const matchesByRound = new Map<number, typeof bracketData.match>()

    for (const match of bracketData.match) {
      const roundId = match.round_id
      const current = matchesByRound.get(roundId) ?? []
      current.push(match)
      matchesByRound.set(roundId, current)
    }

    return bracketData.round
      .slice()
      .sort((left, right) => left.number - right.number)
      .map((round) => ({
        round,
        matches: (matchesByRound.get(round.id) ?? []).slice().sort((left, right) => left.number - right.number),
        participantById,
      }))
  }, [bracketData])

  const bracketColumns = useMemo(() => {
    if (rounds.length === 0) return []

    return rounds.map(({ round, matches, participantById }, index, allRounds): BracketColumn => ({
      title: round.number === 1 ? "Quarterfinals" : round.number === allRounds.length ? "Final" : `Round ${round.number}`,
      subtitle: `${matches.length} match${matches.length === 1 ? "" : "es"}`,
      matches: matches.map((match) => ({
        id: match.id,
        number: match.number,
        state: match.status,
        opponent1: typeof match.opponent1?.id === "number" ? participantById.get(match.opponent1.id)?.name ?? `Team ${match.opponent1.id + 1}` : "BYE",
        opponent2: typeof match.opponent2?.id === "number" ? participantById.get(match.opponent2.id)?.name ?? `Team ${match.opponent2.id + 1}` : "BYE",
        score1: match.opponent1?.score ?? "—",
        score2: match.opponent2?.score ?? "—",
        winnerSide: match.opponent1?.result === "win" ? "opponent1" : match.opponent2?.result === "win" ? "opponent2" : null,
      })),
    }))
  }, [rounds])

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
                    <div className="mt-1 text-lg font-medium">{completedTop8Teams.length}</div>
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

          <div className="min-h-[42rem] rounded-[2rem] border border-border/70 bg-background/75 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">Bracket live</h2>
                <p className="text-sm text-muted-foreground">Version plus compacte avec lignes de transition et scores à droite.</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ChevronRight className="size-4" />
                {message}
              </div>
            </div>

            <div className="overflow-x-auto p-5">
              <div className="min-h-[34rem] rounded-[1.5rem] border border-border/60 bg-background/90 p-4">
                {error ? (
                  <div className="flex min-h-[28rem] items-center justify-center rounded-[1.25rem] border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
                    {error}
                  </div>
                ) : bracketColumns.length === 0 ? (
                  <div className="flex min-h-[28rem] items-center justify-center rounded-[1.25rem] border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
                    {message}
                  </div>
                ) : (
                  <div className="flex min-w-max gap-8">
                    {bracketColumns.map((column, columnIndex) => {
                      const isLastColumn = columnIndex === bracketColumns.length - 1

                      return (
                        <section key={column.title} className="flex w-[20rem] flex-col gap-4">
                          <div className="flex items-end justify-between border-b border-border/60 pb-2">
                            <div>
                              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">{column.title}</div>
                              <div className="text-xs text-muted-foreground">{column.subtitle}</div>
                            </div>
                            <div className="text-xs text-muted-foreground">{columnIndex + 1}/{bracketColumns.length}</div>
                          </div>

                          <div className="flex flex-col gap-5">
                            {column.matches.map((match, matchIndex) => {
                              const showConnector = !isLastColumn
                              const winnerOne = match.winnerSide === "opponent1"
                              const winnerTwo = match.winnerSide === "opponent2"

                              return (
                                <article
                                  key={match.id}
                                  className="relative rounded-2xl border border-border/60 bg-card px-3 py-3 shadow-sm"
                                >
                                  <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                                    <span>Match {match.number}</span>
                                    <span>Finished</span>
                                  </div>

                                  <div className="space-y-2">
                                    <Fragment>
                                      <div className={`grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-3 rounded-xl border px-3 py-2 ${winnerOne ? "border-primary/60 bg-primary/10" : "border-border/60 bg-background/80"}`}>
                                        <span className="truncate text-sm font-medium">{match.opponent1}</span>
                                        <span className="rounded-lg border border-border/60 bg-muted/50 px-2 py-1 text-center text-sm font-semibold tabular-nums text-muted-foreground">{match.score1}</span>
                                      </div>
                                      <div className="relative flex items-center py-1.5">
                                        <div className="h-px w-4 bg-border" />
                                        <div className="h-4 border-l border-border/80" />
                                        <div className="h-px flex-1 bg-border" />
                                      </div>
                                      <div className={`grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-3 rounded-xl border px-3 py-2 ${winnerTwo ? "border-primary/60 bg-primary/10" : "border-border/60 bg-background/80"}`}>
                                        <span className="truncate text-sm font-medium">{match.opponent2}</span>
                                        <span className="rounded-lg border border-border/60 bg-muted/50 px-2 py-1 text-center text-sm font-semibold tabular-nums text-muted-foreground">{match.score2}</span>
                                      </div>
                                    </Fragment>
                                  </div>

                                  {showConnector ? (
                                    <div className="pointer-events-none absolute right-[-2rem] top-1/2 flex items-center">
                                      <div className="h-px w-8 bg-border/80" />
                                      <div className="h-4 border-l border-border/80" />
                                    </div>
                                  ) : null}

                                  {matchIndex !== column.matches.length - 1 ? (
                                    <div className="pointer-events-none absolute right-[-2rem] bottom-[-1.375rem] h-5 w-8 border-r border-b border-border/70" />
                                  ) : null}
                                </article>
                              )
                            })}
                          </div>
                        </section>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export { BracketDemo }