import { useEffect, useState } from "react"
import type { ModelDescription } from "../types/model";
import { OpenAiLogo } from "./OpenAiLogo";

export function ModelSelector() {
  const [ modelDescriptions, setModelDescriptions ] = useState<ModelDescription[]>();
  const [ showModelList, setShowModelList ] = useState<boolean>(false);
  const [ selectedModel, setSelectedModel ] = useState<ModelDescription | null>(null);

  async function fetchData() {
    const res = await fetch("http://localhost:8080/catalog/chat-only")
    if (res.ok) {
      const json = await res.json()
      setModelDescriptions(json)
    }
  }

  function handleModelSelect(model: ModelDescription) {
    setSelectedModel(model)
    setShowModelList(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="">
      <div className="relative border-2">
        
        
        
        {
          showModelList ?
          <div className="shadow-lg rounded-md px-4 py-2 h-64 overflow-auto absolute bottom-12 left-0">
            <OpenAiLogo />
            <div className="px-6">
              {
                modelDescriptions?.map(item => {
                  return (
                    <button className="w-full text-left hover:bg-slate-200 px-4 py-1 cursor-pointer rounded-md" key={item.name} onClick={() => handleModelSelect(item)}>{ item.displayName }</button>
                  )
                })
              }
            </div>
          </div>
          : <></>
        }
        <button className="cursor-pointer hover:bg-gray-200 rounded-md px-4 py-2 transition-all" onClick={ () => setShowModelList(!showModelList) }>
          { selectedModel ? selectedModel.displayName : 'Select Model' }
        </button>
      </div>
      
      
      
    </div>
  )
}