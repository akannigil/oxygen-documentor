'use client'

import { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Rect, Image as KonvaImage, Transformer } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { TemplateField } from '@/shared/types'
import type Konva from 'konva'
import useImage from 'use-image'

interface TemplateEditorProps {
  templateUrl: string
  templateWidth?: number
  templateHeight?: number
  fields: TemplateField[]
  onFieldsChange: (fields: TemplateField[]) => void
}

export function TemplateEditor({
  templateUrl,
  templateWidth,
  templateHeight,
  fields: initialFields,
  onFieldsChange,
}: TemplateEditorProps) {
  const [image, imageStatus] = useImage(templateUrl)
  const [fields, setFields] = useState<TemplateField[]>(initialFields)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [scale, setScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const transformerRef = useRef<Konva.Transformer>(null)
  const stageRef = useRef<Konva.Stage>(null)

  const imgWidth = templateWidth || image?.width || 800
  const imgHeight = templateHeight || image?.height || 600

  useEffect(() => {
    setFields(initialFields)
  }, [initialFields])

  useEffect(() => {
    if (selectedFieldId && transformerRef.current) {
      const stage = transformerRef.current.getStage()
      const selectedNode = stage?.findOne(`.${selectedFieldId}`)
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode])
        transformerRef.current.getLayer()?.batchDraw()
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [selectedFieldId])

  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    // Si on clique sur un élément existant, ne pas créer de nouvelle zone
    const clickedOnEmpty = e.target === e.target.getStage()
    if (clickedOnEmpty) {
      setSelectedFieldId(null)
      setIsDrawing(true)
      const pos = e.target.getStage()?.getPointerPosition()
      if (pos) {
        setDrawStart({ x: pos.x, y: pos.y })
      }
    }
  }

  const handleStageMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !drawStart) return

    const pos = e.target.getStage()?.getPointerPosition()
    if (pos) {
      const x = Math.min(drawStart.x, pos.x)
      const y = Math.min(drawStart.y, pos.y)
      const w = Math.abs(pos.x - drawStart.x)
      const h = Math.abs(pos.y - drawStart.y)
      setCurrentRect({ x, y, w, h })
    }
  }

  const handleStageMouseUp = () => {
    if (!isDrawing || !drawStart || !currentRect) {
      setIsDrawing(false)
      setDrawStart(null)
      setCurrentRect(null)
      return
    }

    // Créer une nouvelle zone seulement si elle a une taille minimale
    if (currentRect.w > 10 && currentRect.h > 10) {
      const newField: TemplateField = {
        key: `field_${Date.now()}`,
        x: currentRect.x / scale,
        y: currentRect.y / scale,
        w: currentRect.w / scale,
        h: currentRect.h / scale,
        type: 'text',
        fontSize: 12,
        align: 'left',
      }

      const updatedFields = [...fields, newField]
      setFields(updatedFields)
      onFieldsChange(updatedFields)
    }

    setIsDrawing(false)
    setDrawStart(null)
    setCurrentRect(null)
  }

  const handleFieldClick = (field: TemplateField, index: number) => {
    setSelectedFieldId(`field-${index}`)
  }

  const handleFieldDragEnd = (field: TemplateField, index: number, e: KonvaEventObject<DragEvent>) => {
    const node = e.target
    const newX = node.x() / scale
    const newY = node.y() / scale

    const updatedFields = fields.map((f, i) =>
      i === index ? { ...f, x: newX, y: newY } : f
    )
    setFields(updatedFields)
    onFieldsChange(updatedFields)
  }

  const handleFieldTransformEnd = (field: TemplateField, index: number, e: KonvaEventObject<Event>) => {
    const node = e.target
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()

    node.scaleX(1)
    node.scaleY(1)

    const newWidth = Math.max(5, node.width() * scaleX)
    const newHeight = Math.max(5, node.height() * scaleY)

    const updatedFields = fields.map((f, i) =>
      i === index
        ? {
            ...f,
            x: node.x() / scale,
            y: node.y() / scale,
            w: newWidth / scale,
            h: newHeight / scale,
          }
        : f
    )
    setFields(updatedFields)
    onFieldsChange(updatedFields)
  }

  const handleDeleteField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index)
    setFields(updatedFields)
    onFieldsChange(updatedFields)
    setSelectedFieldId(null)
  }

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()

    const stage = e.target.getStage()
    if (!stage) return

    const oldScale = scale
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    }

    const newScale = e.evt.deltaY > 0 ? oldScale * 0.95 : oldScale * 1.05
    const clampedScale = Math.max(0.5, Math.min(3, newScale))

    setScale(clampedScale)
    setStagePos({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    })
  }

  if (imageStatus === 'loading') {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500">Chargement du template...</p>
      </div>
    )
  }

  if (imageStatus === 'failed') {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-red-200 bg-red-50">
        <p className="text-sm text-red-800">Erreur lors du chargement du template</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Contrôles */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(Math.max(0.5, scale - 0.1))}
            className="rounded px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
          >
            -
          </button>
          <span className="text-sm text-gray-600">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(Math.min(3, scale + 0.1))}
            className="rounded px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
          >
            +
          </button>
          <button
            onClick={() => {
              setScale(1)
              setStagePos({ x: 0, y: 0 })
            }}
            className="ml-4 rounded px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
          >
            Reset
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {fields.length} zone{fields.length !== 1 ? 's' : ''} définie{fields.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Canvas */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <Stage
          ref={stageRef}
          width={800}
          height={600}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onWheel={handleWheel}
          scaleX={scale}
          scaleY={scale}
          x={stagePos.x}
          y={stagePos.y}
          style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
        >
          <Layer>
            {/* Image de fond */}
            {image && (
              <KonvaImage
                image={image}
                width={imgWidth}
                height={imgHeight}
                x={0}
                y={0}
              />
            )}

            {/* Rectangles de dessin en cours */}
            {isDrawing && currentRect && (
              <Rect
                x={currentRect.x}
                y={currentRect.y}
                width={currentRect.w}
                height={currentRect.h}
                stroke="#3b82f6"
                strokeWidth={2}
                dash={[5, 5]}
                fill="rgba(59, 130, 246, 0.1)"
              />
            )}

            {/* Zones définies */}
            {fields.map((field, index) => {
              const isSelected = selectedFieldId === `field-${index}`
              return (
                <Rect
                  key={`field-${index}`}
                  name={`field-${index}`}
                  x={field.x * scale}
                  y={field.y * scale}
                  width={field.w * scale}
                  height={field.h * scale}
                  stroke={isSelected ? '#3b82f6' : '#6b7280'}
                  strokeWidth={isSelected ? 3 : 1}
                  fill="rgba(59, 130, 246, 0.1)"
                  draggable
                  onClick={() => handleFieldClick(field, index)}
                  onDragEnd={(e) => handleFieldDragEnd(field, index, e)}
                  onTransformEnd={(e) => handleFieldTransformEnd(field, index, e)}
                />
              )
            })}

            {/* Transformer pour redimensionnement */}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                // Limiter la taille minimale
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox
                }
                return newBox
              }}
            />
          </Layer>
        </Stage>
      </div>

      {/* Liste des zones avec actions */}
      {selectedFieldId && (
        <FieldPropertiesPanel
          field={fields.find((_, i) => `field-${i}` === selectedFieldId)!}
          index={Number.parseInt(selectedFieldId.split('-')[1]!)}
          onUpdate={(updatedField) => {
            const updatedFields = fields.map((f, i) =>
              i === updatedField.index ? updatedField.field : f
            )
            setFields(updatedFields)
            onFieldsChange(updatedFields)
          }}
          onDelete={handleDeleteField}
        />
      )}
    </div>
  )
}

interface FieldPropertiesPanelProps {
  field: TemplateField
  index: number
  onUpdate: (field: { field: TemplateField; index: number }) => void
  onDelete: (index: number) => void
}

function FieldPropertiesPanel({ field, index, onUpdate, onDelete }: FieldPropertiesPanelProps) {
  const [localField, setLocalField] = useState(field)

  useEffect(() => {
    setLocalField(field)
  }, [field])

  const handleChange = (key: keyof TemplateField, value: unknown) => {
    const updated = { ...localField, [key]: value }
    setLocalField(updated)
    onUpdate({ field: updated, index })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">Propriétés de la zone</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700">Clé</label>
          <input
            type="text"
            value={localField.key}
            onChange={(e) => handleChange('key', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Type</label>
          <select
            value={localField.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="text">Texte</option>
            <option value="qrcode">QR Code</option>
            <option value="date">Date</option>
            <option value="number">Nombre</option>
          </select>
        </div>
        {localField.type === 'text' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700">Taille de police</label>
              <input
                type="number"
                value={localField.fontSize || 12}
                onChange={(e) => handleChange('fontSize', Number.parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                min={8}
                max={72}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Alignement</label>
              <select
                value={localField.align || 'left'}
                onChange={(e) => handleChange('align', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="left">Gauche</option>
                <option value="center">Centre</option>
                <option value="right">Droite</option>
              </select>
            </div>
          </>
        )}
        <button
          onClick={() => onDelete(index)}
          className="mt-4 w-full rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
        >
          Supprimer la zone
        </button>
      </div>
    </div>
  )
}

