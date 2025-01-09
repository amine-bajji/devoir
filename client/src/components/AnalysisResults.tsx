'use client'

import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Network } from 'vis-network'
import { DataSet } from 'vis-data'

interface Entity {
  text: string
  label: string
  wikidata_id: string | null
  description: string | null
}

interface Relation {
  source: string
  target: string
  type: string
}

interface AnalysisResultsProps {
  results: {
    entities: Entity[]
    keywords: string[]
    sentiment: number
    relations: Relation[]
  }
}

export default function AnalysisResults({ results }: AnalysisResultsProps) {
  const networkRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (networkRef.current) {
      const nodes = new DataSet(
        results.entities.map((entity) => ({
          id: entity.text,
          label: entity.text,
          title: `${entity.label}: ${entity.description || 'No description available'}`,
        }))
      )

      const edges = new DataSet(
        results.relations.map((relation, index) => ({
          id: index,
          from: relation.source,
          to: relation.target,
          label: relation.type,
        }))
      )

      const data = { nodes, edges }

      const options = {
        nodes: {
          shape: 'dot',
          size: 16,
          font: {
            size: 12,
            color: '#333',
          },
          borderWidth: 2,
          shadow: true,
        },
        edges: {
          width: 2,
          color: { color: '#5c6bc0', highlight: '#3f51b5', hover: '#3f51b5' },
          font: {
            size: 10,
            color: '#666',
          },
          arrows: {
            to: { enabled: true, scaleFactor: 0.5 },
          },
        },
        physics: {
          forceAtlas2Based: {
            gravitationalConstant: -26,
            centralGravity: 0.005,
            springLength: 230,
            springConstant: 0.18,
          },
          maxVelocity: 146,
          solver: 'forceAtlas2Based',
          timestep: 0.35,
          stabilization: { iterations: 150 },
        },
      }

      new Network(networkRef.current, data, options)
    }
  }, [results])

  return (
    <div className="mt-8 space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600">
          <CardTitle className="text-white">Analysis Results</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Entities</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {results.entities.map((entity, index) => (
                    <li key={index} className="border-b pb-2 last:border-b-0">
                      <span className="font-semibold text-lg">{entity.text}</span>
                      <Badge className="ml-2" variant="secondary">{entity.label}</Badge>
                      {entity.wikidata_id && (
                        <span className="block text-sm text-blue-600">
                          Wikidata ID: {entity.wikidata_id}
                        </span>
                      )}
                      {entity.description && (
                        <p className="text-sm text-gray-600 mt-1">{entity.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {results.keywords.map((keyword, index) => (
                    <Badge key={index} variant="outline">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Sentiment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <div className="text-4xl font-bold">{results.sentiment.toFixed(2)}</div>
                <Badge className="ml-4" variant={results.sentiment > 0 ? "default" : results.sentiment < 0 ? "destructive" : "secondary"}>
                  {results.sentiment > 0 ? 'Positive' : results.sentiment < 0 ? 'Negative' : 'Neutral'}
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Relations Graph</CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={networkRef} style={{ height: '400px', width: '100%' }} />
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Relations List</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {results.relations.map((relation, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <span className="font-medium">{relation.source}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-400"
                    >
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                    <span className="font-medium">{relation.target}</span>
                    <Badge variant="outline" className="ml-2">
                      {relation.type}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}