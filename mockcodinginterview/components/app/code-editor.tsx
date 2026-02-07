'use client';

import React, { useEffect, useRef } from 'react';
import type { RpcInvocationData } from 'livekit-client';
import { useLocalParticipant, useSessionContext } from '@livekit/components-react';
import Editor, { type OnMount } from '@monaco-editor/react';

type MonacoEditor = Parameters<OnMount>[0];

interface CodeEditorProps {
  className?: string;
  initialCode?: string;
}

export interface CodeEditorHandle {
  getCode: () => string;
}

export const CodeEditor = React.forwardRef<CodeEditorHandle, CodeEditorProps>(
  ({ className, initialCode }, ref) => {
    const editorRef = useRef<MonacoEditor | null>(null);

    const handleEditorDidMount: OnMount = (editor) => {
      editorRef.current = editor;
    };

    React.useImperativeHandle(ref, () => ({
      getCode: () => {
        if (!editorRef.current) return '';
        const model = editorRef.current.getModel();
        if (!model) return '';
        return model.getValue();
      },
    }));

    const defaultCode = `# -----------------------------------------------------------
# PROBLEM DESCRIPTION:
# -----------------------------------------------------------
# Given an array of integers \`nums\` and an integer \`target\`,
# return indices of the two numbers such that they add up to \`target\`.
#
# You may assume that each input would have exactly one solution,
# and you may not use the same element twice.
#
# You can return the answer in any order.
#
# Example 1:
#   Input: nums = [2,7,11,15], target = 9
#   Output: [0,1]
#   Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
#
# Example 2:
#   Input: nums = [3,2,4], target = 6
#   Output: [1,2]
#
# Example 3:
#   Input: nums = [3,3], target = 6
#   Output: [0,1]
# -----------------------------------------------------------

def two_sum(nums, target):
    """
    :type nums: List[int]
    :type target: int
    :rtype: List[int]
    """
    # TODO: Write your solution here
    pass

# -----------------------------------------------------------
# TEST CASES
# -----------------------------------------------------------
if __name__ == "__main__":
    print("Test Case 1:", two_sum([2, 7, 11, 15], 9)) # Expected: [0, 1]
    print("Test Case 2:", two_sum([3, 2, 4], 6))      # Expected: [1, 2]
    print("Test Case 3:", two_sum([3, 3], 6))         # Expected: [0, 1]`;

    return (
      <div className={className}>
        <Editor
          height="100%"
          defaultLanguage="python"
          defaultValue={initialCode || defaultCode}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    );
  }
);

CodeEditor.displayName = 'CodeEditor';
