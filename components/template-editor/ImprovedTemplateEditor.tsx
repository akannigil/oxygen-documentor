'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Stage, Layer, Rect, Image as KonvaImage, Transformer, Line, Text } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { TemplateField } from '@/shared/types'
import type Konva from 'konva'
import useImage from 'use-image'
import { QRCodeConfiguration } from './QRCodeConfiguration'

export interface ImprovedTemplateEditorProps {
  templateUrl: string
  templateWidth?: number
  templateHeight?: number
  fields: TemplateField[]
  onFieldsChange: (fields: TemplateField[]) => void
}

export function ImprovedTemplateEditor({
  templateUrl,
  templateWidth,
  templateHeight,
  fields: initialFields,
  onFieldsChange,
}: ImprovedTemplateEditorProps) {
  const [image] = useImage(templateUrl)
  const [fields, setFields] = useState<TemplateField[]>(initialFields)
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(true)
  
  const transformerRef = useRef<Konva.Transformer>(null)
  const stageRef = useRef<Konva.Stage>(null)

  // Dimensions réelles de l'image
  const realWidth = templateWidth || image?.width || 800
  const realHeight = templateHeight || image?.height || 1000

  // Calculer le scale pour adapter l'image au canvas
  const maxCanvasWidth = 900
  const maxCanvasHeight = 700
  const scaleX = maxCanvasWidth / realWidth
  const scaleY = maxCanvasHeight / realHeight
  const displayScale = Math.min(scaleX, scaleY, 1) // Ne pas agrandir, seulement réduire

  const displayWidth = realWidth * displayScale
  const displayHeight = realHeight * displayScale

  const gridSize = 10 // Grille de 10px

  useEffect(() => {
    setFields(initialFields)
  }, [initialFields])

  // Fonction pour snapper aux coordonnées de la grille
  const snapToGridValue = (value: number) => {
    if (!snapToGrid) return value
    return Math.round(value / gridSize) * gridSize
  }

  // Convertir les coordonnées d'affichage en coordonnées réelles
  const displayToReal = (displayCoord: number) => {
    return Math.round(displayCoord / displayScale)
  }

  // Convertir les coordonnées réelles en coordonnées d'affichage
  const realToDisplay = (realCoord: number) => {
    return realCoord * displayScale
  }

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'background-image'
    
    if (clickedOnEmpty) {
      setSelectedFieldIndex(null)
      setIsDrawing(true)
      const pos = e.target.getStage()?.getPointerPosition()
      if (pos) {
        const snappedX = snapToGridValue(pos.x)
        const snappedY = snapToGridValue(pos.y)
        setDrawStart({ x: snappedX, y: snappedY })
      }
    }
  }

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !drawStart) return

    const pos = e.target.getStage()?.getPointerPosition()
    if (pos) {
      const snappedX = snapToGridValue(pos.x)
      const snappedY = snapToGridValue(pos.y)
      
      const x = Math.min(drawStart.x, snappedX)
      const y = Math.min(drawStart.y, snappedY)
      const w = Math.abs(snappedX - drawStart.x)
      const h = Math.abs(snappedY - drawStart.y)
      
      setCurrentRect({ x, y, w, h })
    }
  }

  const handleMouseUp = () => {
    if (isDrawing && currentRect && currentRect.w > 5 && currentRect.h > 5) {
      // Convertir en coordonnées réelles
      const newField: TemplateField = {
        key: `field_${Date.now()}`,
        x: displayToReal(currentRect.x),
        y: displayToReal(currentRect.y),
        w: displayToReal(currentRect.w),
        h: displayToReal(currentRect.h),
        type: 'text',
        fontSize: 12,
        align: 'left',
      }
      
      const updatedFields = [...fields, newField]
      setFields(updatedFields)
      onFieldsChange(updatedFields)
      setSelectedFieldIndex(updatedFields.length - 1)
    }
    
    setIsDrawing(false)
    setDrawStart(null)
    setCurrentRect(null)
  }

  const handleFieldClick = (index: number) => {
    setSelectedFieldIndex(index)
  }

  const handleFieldDragEnd = (index: number, e: KonvaEventObject<DragEvent>) => {
    const node = e.target
    const snappedX = snapToGridValue(node.x())
    const snappedY = snapToGridValue(node.y())
    
    node.x(snappedX)
    node.y(snappedY)
    
    const updatedFields = [...fields]
    const updatedField = {
      ...updatedFields[index],
      x: displayToReal(snappedX),
      y: displayToReal(snappedY),
    } as TemplateField
    updatedFields[index] = updatedField
    setFields(updatedFields)
    onFieldsChange(updatedFields)
  }

  const handleFieldTransformEnd = (index: number, e: KonvaEventObject<Event>) => {
    const node = e.target
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    
    const newWidth = snapToGridValue(node.width() * scaleX)
    const newHeight = snapToGridValue(node.height() * scaleY)
    const newX = snapToGridValue(node.x())
    const newY = snapToGridValue(node.y())
    
    node.scaleX(1)
    node.scaleY(1)
    node.width(newWidth)
    node.height(newHeight)
    node.x(newX)
    node.y(newY)
    
    const updatedFields = [...fields]
    const updatedField = {
      ...updatedFields[index],
      x: displayToReal(newX),
      y: displayToReal(newY),
      w: displayToReal(newWidth),
      h: displayToReal(newHeight),
    } as TemplateField
    updatedFields[index] = updatedField
    setFields(updatedFields)
    onFieldsChange(updatedFields)
  }

  const handleFieldUpdate = (index: number, updates: Partial<TemplateField>) => {
    const updatedFields = [...fields]
    const updatedField = { ...updatedFields[index], ...updates } as TemplateField
    updatedFields[index] = updatedField
    setFields(updatedFields)
    onFieldsChange(updatedFields)
  }

  const handleFieldDelete = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index)
    setFields(updatedFields)
    onFieldsChange(updatedFields)
    setSelectedFieldIndex(null)
  }

  const selectedField = selectedFieldIndex !== null ? fields[selectedFieldIndex] : null

  // Attacher le transformer au champ sélectionné
  useEffect(() => {
    if (selectedFieldIndex !== null && transformerRef.current) {
      const stage = transformerRef.current.getStage()
      const selectedNode = stage?.findOne(`.field-${selectedFieldIndex}`)
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode])
        transformerRef.current.getLayer()?.batchDraw()
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [selectedFieldIndex])

  // Générer les lignes de la grille
  const gridLines = useMemo(() => {
    if (!showGrid) return []
    const lines = []
    
    // Lignes verticales
    for (let i = 0; i <= displayWidth; i += gridSize) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i, 0, i, displayHeight]}
          stroke="#e5e7eb"
          strokeWidth={0.5}
          listening={false}
        />
      )
    }
    
    // Lignes horizontales
    for (let i = 0; i <= displayHeight; i += gridSize) {
      lines.push(
        <Line
          key={`h-${i}`}
          points={[0, i, displayWidth, i]}
          stroke="#e5e7eb"
          strokeWidth={0.5}
          listening={false}
        />
      )
    }
    
    return lines
  }, [showGrid, displayWidth, displayHeight])

  return (
    <div className="flex h-full flex-col gap-4 lg:flex-row">
      {/* Canvas */}
      <div className="flex-1">
        <div className="mb-4 flex items-center gap-4 rounded-lg bg-white p-3 shadow-sm">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="rounded border-gray-300"
            />
            Afficher la grille
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
              className="rounded border-gray-300"
            />
            Aimanter à la grille
          </label>
          <div className="ml-auto text-xs text-gray-500">
            Dimensions: {realWidth} × {realHeight}px | Échelle: {Math.round(displayScale * 100)}%
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg border-2 border-gray-300 bg-gray-100 shadow-lg">
          <Stage
            ref={stageRef}
            width={displayWidth}
            height={displayHeight}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
          >
            <Layer>
              {/* Image de fond */}
              {image && (
                <KonvaImage
                  name="background-image"
                  image={image}
                  width={displayWidth}
                  height={displayHeight}
                />
              )}

              {/* Grille */}
              {gridLines}

              {/* Rectangle en cours de dessin */}
              {isDrawing && currentRect && (
                <Rect
                  x={currentRect.x}
                  y={currentRect.y}
                  width={currentRect.w}
                  height={currentRect.h}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dash={[5, 5]}
                  fill="rgba(59, 130, 246, 0.2)"
                  listening={false}
                />
              )}

              {/* Champs existants */}
              {fields.map((field, index) => {
                const isSelected = selectedFieldIndex === index
                const displayX = realToDisplay(field.x)
                const displayY = realToDisplay(field.y)
                const displayW = realToDisplay(field.w)
                const displayH = realToDisplay(field.h)
                
                return (
                  <React.Fragment key={index}>
                    <Rect
                      name={`field-${index}`}
                      x={displayX}
                      y={displayY}
                      width={displayW}
                      height={displayH}
                      fill={isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)'}
                      stroke={isSelected ? '#3b82f6' : '#6b7280'}
                      strokeWidth={isSelected ? 2 : 1}
                      draggable
                      onClick={() => handleFieldClick(index)}
                      onDragEnd={(e) => handleFieldDragEnd(index, e)}
                      onTransformEnd={(e) => handleFieldTransformEnd(index, e)}
                    />
                    {/* Label du champ */}
                    <Text
                      x={displayX}
                      y={displayY - 16}
                      text={field.key}
                      fontSize={11}
                      fill="#374151"
                      listening={false}
                    />
                    {/* Coordonnées */}
                    <Text
                      x={displayX + 2}
                      y={displayY + 2}
                      text={`${field.x},${field.y}\n${field.w}×${field.h}`}
                      fontSize={9}
                      fill="#6b7280"
                      listening={false}
                    />
                  </React.Fragment>
                )
              })}

              {/* Transformer */}
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 10 || newBox.height < 10) {
                    return oldBox
                  }
                  return newBox
                }}
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                rotateEnabled={false}
              />
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Panneau de propriétés */}
      <div className="w-full lg:w-80">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">
            {selectedField ? `Éditer: ${selectedField.key}` : 'Propriétés du champ'}
          </h3>
          
          {selectedField && selectedFieldIndex !== null ? (
            <FieldPropertiesPanel
              field={selectedField}
              index={selectedFieldIndex}
              onUpdate={handleFieldUpdate}
              onDelete={handleFieldDelete}
            />
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">
                Dessinez un rectangle sur l&apos;image<br />ou cliquez sur un champ existant
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Composant pour les propriétés du champ
interface FieldPropertiesPanelProps {
  field: TemplateField
  index: number
  onUpdate: (index: number, updates: Partial<TemplateField>) => void
  onDelete: (index: number) => void
}

function FieldPropertiesPanel({ field, index, onUpdate, onDelete }: FieldPropertiesPanelProps) {
  return (
    <div className="space-y-3 max-h-[600px] overflow-y-auto">
      <div>
        <label className="block text-xs font-medium text-gray-700">Clé du champ</label>
        <input
          type="text"
          value={field.key}
          onChange={(e) => onUpdate(index, { key: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700">Type</label>
        <select
          value={field.type}
          onChange={(e) => onUpdate(index, { type: e.target.value as 'text' | 'number' | 'date' | 'qrcode' })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="text">Texte</option>
          <option value="number">Nombre</option>
          <option value="date">Date</option>
          <option value="qrcode">QR Code</option>
        </select>
      </div>

      {field.type !== 'qrcode' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-700">Taille de police (px)</label>
            <input
              type="number"
              value={field.fontSize || 12}
              onChange={(e) => onUpdate(index, { fontSize: parseInt(e.target.value) })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              min={6}
              max={72}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Police</label>
            <select
              value={field.fontFamily || 'Helvetica'}
              onChange={(e) => onUpdate(index, { fontFamily: e.target.value as 'Helvetica' | 'Helvetica-Bold' | 'Times-Roman' | 'Times-Bold' | 'Courier' | 'Courier-Bold' })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="Helvetica">Helvetica</option>
              <option value="Helvetica-Bold">Helvetica Bold</option>
              <option value="Times-Roman">Times Roman</option>
              <option value="Times-Bold">Times Bold</option>
              <option value="Courier">Courier</option>
              <option value="Courier-Bold">Courier Bold</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Alignement</label>
            <select
              value={field.align || 'left'}
              onChange={(e) => onUpdate(index, { align: e.target.value as 'left' | 'center' | 'right' })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="left">Gauche</option>
              <option value="center">Centre</option>
              <option value="right">Droite</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Couleur du texte</label>
            <div className="mt-1 flex gap-2">
              <input
                type="color"
                value={field.textColor || '#000000'}
                onChange={(e) => onUpdate(index, { textColor: e.target.value })}
                className="h-9 w-16 rounded border border-gray-300"
              />
              <input
                type="text"
                value={field.textColor || '#000000'}
                onChange={(e) => onUpdate(index, { textColor: e.target.value })}
                className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        </>
      )}

      {field.type === 'qrcode' && (
        <QRCodeConfiguration field={field} index={index} onUpdate={onUpdate} />
      )}

      <div className="pt-3 border-t border-gray-200">
        <button
          onClick={() => onDelete(index)}
          className="w-full rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
        >
          Supprimer le champ
        </button>
      </div>
    </div>
  )
}
