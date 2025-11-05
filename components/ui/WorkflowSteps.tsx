'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  name: string;
  description: string;
  href: string;
  status: 'complete' | 'current' | 'upcoming';
  actionLabel?: string; // Label optionnel pour le bouton d'action
}

interface WorkflowStepsProps {
  steps: Step[];
  className?: string;
}

export function WorkflowSteps({ steps, className }: WorkflowStepsProps) {
  return (
    <nav aria-label="Progress" className={cn('mb-8', className)}>
      <ol role="list" className="overflow-hidden">
        {steps.map((step, stepIdx) => (
          <li key={step.id} className={cn(stepIdx !== steps.length - 1 ? 'pb-10' : '', 'relative')}>
            {step.status === 'complete' ? (
              <>
                {stepIdx !== steps.length - 1 ? (
                  <div className="absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 bg-blue-600" aria-hidden="true" />
                ) : null}
                <Link href={step.href} className="group relative flex items-start">
                  <span className="flex h-9 items-center">
                    <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 group-hover:bg-blue-800">
                      <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </span>
                  <span className="ml-4 min-w-0 flex-1">
                    <span className="text-sm font-medium text-gray-900">{step.name}</span>
                    <span className="text-sm text-gray-500 block">{step.description}</span>
                  </span>
                </Link>
              </>
            ) : step.status === 'current' ? (
              <>
                {stepIdx !== steps.length - 1 ? (
                  <div className="absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300" aria-hidden="true" />
                ) : null}
                <div className="group relative flex items-start">
                  <Link href={step.href} className="flex-1" aria-current="step">
                    <span className="flex h-9 items-center" aria-hidden="true">
                      <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-600 bg-white">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                      </span>
                    </span>
                    <span className="ml-4 min-w-0 flex-1">
                      <span className="text-sm font-medium text-blue-600">{step.name}</span>
                      <span className="text-sm text-gray-500 block">{step.description}</span>
                    </span>
                  </Link>
                  {step.actionLabel && (
                    <div className="ml-4 flex items-center">
                      <Link
                        href={step.href}
                        className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-purple-700 hover:shadow-md"
                      >
                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {step.actionLabel}
                      </Link>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {stepIdx !== steps.length - 1 ? (
                  <div className="absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300" aria-hidden="true" />
                ) : null}
                <Link href={step.href} className="group relative flex items-start">
                  <span className="flex h-9 items-center" aria-hidden="true">
                    <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white group-hover:border-gray-400">
                      <span className="h-2.5 w-2.5 rounded-full bg-transparent group-hover:bg-gray-300" />
                    </span>
                  </span>
                  <span className="ml-4 min-w-0 flex-1">
                    <span className="text-sm font-medium text-gray-500">{step.name}</span>
                    <span className="text-sm text-gray-500 block">{step.description}</span>
                  </span>
                </Link>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
