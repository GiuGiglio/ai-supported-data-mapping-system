'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { projectService, productDataService } from '@/lib/supabase-services'
import { Project, ProductData } from '@/lib/supabase'
import { RefreshCw, Database, FileText, Eye } from 'lucide-react'

export function SupabaseDataViewer() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [productData, setProductData] = useState<ProductData[]>([])
  const [loading, setLoading] = useState(false)

  const loadProjects = async () => {
    setLoading(true)
    try {
      // Using same mock user ID as FileUpload component
      const mockUserId = '96e65406-f077-4709-8671-2f092c9f7bfb'
      const projectsData = await projectService.getProjects(mockUserId)
      setProjects(projectsData)
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProductData = async (projectId: string) => {
    setLoading(true)
    try {
      const data = await productDataService.getProductData(projectId)
      setProductData(data)
    } catch (error) {
      console.error('Error loading product data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const handleProjectSelect = async (project: Project) => {
    setSelectedProject(project)
    await loadProductData(project.id)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
          <Database className="h-6 w-6 mr-2" />
          Supabase Data Viewer
        </h2>
        <Button onClick={loadProjects} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Projects</h3>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : projects.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No projects found</p>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedProject?.id === project.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleProjectSelect(project)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{project.name}</p>
                        <p className="text-xs text-gray-500">
                          {project.total_rows} rows • {formatDate(project.created_at)}
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        project.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : project.status === 'processing'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {project.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Data */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Product Data
              {selectedProject && (
                <span className="text-sm text-gray-500 ml-2">
                  ({selectedProject.name})
                </span>
              )}
            </h3>
            
            {!selectedProject ? (
              <p className="text-gray-500 text-center py-8">
                Select a project to view its data
              </p>
            ) : loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : productData.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No data found for this project</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {productData.length} rows of data
                  </p>
                </div>
                
                <div className="max-h-96 overflow-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Row
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quality Score
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {productData.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            {item.row_number}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              item.validation_status === 'valid'
                                ? 'bg-green-100 text-green-800'
                                : item.validation_status === 'invalid'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.validation_status}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            {item.quality_score ? `${(item.quality_score * 100).toFixed(1)}%` : 'N/A'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                console.log('Source data:', item.source_data)
                                alert('Check console for source data')
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 