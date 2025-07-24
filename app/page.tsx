"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileText, Dna, Info, Filter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface VCFHeader {
  fileformat?: string
  source?: string
  reference?: string
  contigs?: string[]
  info?: Record<string, string>
  format?: Record<string, string>
  samples?: string[]
}

interface VCFVariant {
  chrom: string
  pos: number
  id: string
  ref: string
  alt: string[]
  qual: number | null
  filter: string
  info: Record<string, string>
  format?: string[]
  samples?: Record<string, string[]>
}

interface VCFData {
  header: VCFHeader
  variants: VCFVariant[]
}

export default function GenCryptionApp() {
  const [vcfData, setVcfData] = useState<VCFData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fileName, setFileName] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedChrom, setSelectedChrom] = useState<string>("all")

  const parseVCF = (vcfContent: string): VCFData => {
    const lines = vcfContent.split("\n").filter((line) => line.trim())
    const header: VCFHeader = {
      contigs: [],
      info: {},
      format: {},
      samples: [],
    }
    const variants: VCFVariant[] = []

    let headerSection = true
    let columnHeaders: string[] = []

    for (const line of lines) {
      if (line.startsWith("##")) {
        // Parse header lines
        if (line.startsWith("##fileformat=")) {
          header.fileformat = line.split("=")[1]
        } else if (line.startsWith("##source=")) {
          header.source = line.split("=")[1]
        } else if (line.startsWith("##reference=")) {
          header.reference = line.split("=")[1]
        } else if (line.startsWith("##contig=")) {
          const contigMatch = line.match(/ID=([^,>]+)/)
          if (contigMatch && header.contigs) {
            header.contigs.push(contigMatch[1])
          }
        } else if (line.startsWith("##INFO=")) {
          const infoMatch = line.match(/ID=([^,]+).*Description="([^"]*)"/)
          if (infoMatch && header.info) {
            header.info[infoMatch[1]] = infoMatch[2]
          }
        } else if (line.startsWith("##FORMAT=")) {
          const formatMatch = line.match(/ID=([^,]+).*Description="([^"]*)"/)
          if (formatMatch && header.format) {
            header.format[formatMatch[1]] = formatMatch[2]
          }
        }
      } else if (line.startsWith("#CHROM")) {
        // Column header line
        columnHeaders = line.split("\t")
        header.samples = columnHeaders.slice(9) // Samples start from column 10
        headerSection = false
      } else if (!headerSection && line.trim()) {
        // Parse variant lines
        const fields = line.split("\t")
        if (fields.length >= 8) {
          const variant: VCFVariant = {
            chrom: fields[0],
            pos: Number.parseInt(fields[1]),
            id: fields[2] === "." ? `${fields[0]}:${fields[1]}` : fields[2],
            ref: fields[3],
            alt: fields[4].split(","),
            qual: fields[5] === "." ? null : Number.parseFloat(fields[5]),
            filter: fields[6],
            info: {},
            samples: {},
          }

          // Parse INFO field
          if (fields[7] !== ".") {
            const infoPairs = fields[7].split(";")
            for (const pair of infoPairs) {
              const [key, value] = pair.split("=")
              variant.info[key] = value || "true"
            }
          }

          // Parse FORMAT and sample data
          if (fields.length > 8 && fields[8] !== ".") {
            variant.format = fields[8].split(":")
            for (let i = 9; i < fields.length && i < columnHeaders.length; i++) {
              const sampleName = columnHeaders[i]
              variant.samples![sampleName] = fields[i].split(":")
            }
          }

          variants.push(variant)
        }
      }
    }

    return { header, variants }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith(".vcf")) {
      alert("Please select a VCF file")
      return
    }

    setIsLoading(true)
    setFileName(file.name)

    try {
      const content = await file.text()
      const parsedData = parseVCF(content)
      setVcfData(parsedData)
    } catch (error) {
      console.error("Error parsing VCF file:", error)
      alert("Error parsing VCF file. Please check the file format.")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredVariants =
    vcfData?.variants.filter((variant) => {
      const matchesSearch =
        searchTerm === "" ||
        variant.chrom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        variant.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        variant.ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
        variant.alt.some((alt) => alt.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesChrom = selectedChrom === "all" || variant.chrom === selectedChrom

      return matchesSearch && matchesChrom
    }) || []

  const uniqueChroms = Array.from(new Set(vcfData?.variants.map((v) => v.chrom) || [])).sort()

  const getVariantType = (ref: string, alt: string[]): string => {
    if (alt.length > 1) return "Multi-allelic"
    const altAllele = alt[0]
    if (ref.length === 1 && altAllele.length === 1) return "SNV"
    if (ref.length > altAllele.length) return "Deletion"
    if (ref.length < altAllele.length) return "Insertion"
    return "Complex"
  }

  const getVariantTypeColor = (type: string): string => {
    switch (type) {
      case "SNV":
        return "bg-blue-100 text-blue-800"
      case "Insertion":
        return "bg-green-100 text-green-800"
      case "Deletion":
        return "bg-red-100 text-red-800"
      case "Multi-allelic":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Dna className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              GenCryption
            </h1>
          </div>
          <p className="text-muted-foreground">Import and analyze genomic VCF (Variant Call Format) files</p>
        </div>

        {/* File Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import VCF File
            </CardTitle>
            <CardDescription>Select a VCF (Variant Call Format) file to analyze genomic variants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="vcf-file">Choose VCF File</Label>
                <Input
                  id="vcf-file"
                  type="file"
                  accept=".vcf"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>
              {fileName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span>Selected: {fileName}</span>
                </div>
              )}
              {isLoading && (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Processing VCF file...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* VCF Data Display */}
        {vcfData && (
          <Tabs defaultValue="variants" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="variants">Variants</TabsTrigger>
              <TabsTrigger value="header">Header Info</TabsTrigger>
              <TabsTrigger value="samples">Samples</TabsTrigger>
            </TabsList>

            <TabsContent value="variants" className="space-y-4">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Label htmlFor="search">Search Variants</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="search"
                          placeholder="Search by chromosome, ID, ref, or alt..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="chromosome">Chromosome</Label>
                      <select
                        id="chromosome"
                        value={selectedChrom}
                        onChange={(e) => setSelectedChrom(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      >
                        <option value="all">All Chromosomes</option>
                        {uniqueChroms.map((chrom) => (
                          <option key={chrom} value={chrom}>
                            {chrom}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Variants Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Genomic Variants</CardTitle>
                    <Badge variant="secondary">
                      {filteredVariants.length} variant{filteredVariants.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border max-h-96 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Chromosome</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead>Ref</TableHead>
                          <TableHead>Alt</TableHead>
                          <TableHead>Quality</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Filter</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVariants.slice(0, 100).map((variant, index) => {
                          const variantType = getVariantType(variant.ref, variant.alt)
                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{variant.chrom}</TableCell>
                              <TableCell>{variant.pos.toLocaleString()}</TableCell>
                              <TableCell className="max-w-32 truncate">{variant.id}</TableCell>
                              <TableCell className="font-mono text-sm">{variant.ref}</TableCell>
                              <TableCell className="font-mono text-sm">{variant.alt.join(", ")}</TableCell>
                              <TableCell>{variant.qual?.toFixed(1) || "N/A"}</TableCell>
                              <TableCell>
                                <Badge className={getVariantTypeColor(variantType)}>{variantType}</Badge>
                              </TableCell>
                              <TableCell>{variant.filter}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {filteredVariants.length > 100 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Showing first 100 variants of {filteredVariants.length} total
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="header" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    VCF Header Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium">File Format</Label>
                      <p className="text-sm text-muted-foreground">{vcfData.header.fileformat || "Not specified"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Source</Label>
                      <p className="text-sm text-muted-foreground">{vcfData.header.source || "Not specified"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Reference</Label>
                      <p className="text-sm text-muted-foreground">{vcfData.header.reference || "Not specified"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Contigs</Label>
                      <p className="text-sm text-muted-foreground">
                        {vcfData.header.contigs?.length || 0} contigs defined
                      </p>
                    </div>
                  </div>

                  {vcfData.header.info && Object.keys(vcfData.header.info).length > 0 && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">INFO Fields</Label>
                      <div className="space-y-2 max-h-48 overflow-auto">
                        {Object.entries(vcfData.header.info).map(([key, description]) => (
                          <div key={key} className="border rounded p-2">
                            <code className="text-sm font-mono bg-muted px-1 rounded">{key}</code>
                            <p className="text-xs text-muted-foreground mt-1">{description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="samples" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sample Information</CardTitle>
                  <CardDescription>
                    {vcfData.header.samples?.length || 0} sample{(vcfData.header.samples?.length || 0) !== 1 ? "s" : ""}{" "}
                    found
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {vcfData.header.samples && vcfData.header.samples.length > 0 ? (
                    <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
                      {vcfData.header.samples.map((sample, index) => (
                        <Badge key={index} variant="outline" className="justify-center p-2">
                          {sample}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No sample information available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {!vcfData && !isLoading && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Dna className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No VCF file loaded</h3>
              <p className="text-muted-foreground mb-4">Upload a VCF file to analyze genomic variants</p>
              <Button onClick={() => document.getElementById("vcf-file")?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Choose VCF File
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
